import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PaymentsService {
  private razorpay: Razorpay;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.razorpay = new Razorpay({
      key_id: configService.get('RAZORPAY_KEY_ID'),
      key_secret: configService.get('RAZORPAY_KEY_SECRET'),
    });
  }

  async createPaymentOrder(campaignId: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.userId !== userId) {
      throw new UnauthorizedException('Cannot create payment for another user campaign');
    }

    const existingPayment = await this.prisma.payment.findUnique({
      where: { campaignId },
    });

    if (existingPayment && existingPayment.status === 'CAPTURED') {
      throw new BadRequestException('Payment already completed for this campaign');
    }

    const options = {
      amount: Math.round(campaign.totalAmount * 100), // Amount in paise
      currency: 'INR',
      receipt: `campaign-${campaignId}`,
      notes: {
        campaignId,
        userId,
      },
    };

    const order = await this.razorpay.orders.create(options);

    let payment = await this.prisma.payment.findUnique({
      where: { campaignId },
    });

    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          campaignId,
          userId,
          amount: campaign.totalAmount,
          currency: 'INR',
          provider: 'RAZORPAY',
          razorpayOrderId: order.id,
          status: 'PENDING',
        },
      });
    } else {
      payment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          razorpayOrderId: order.id,
          status: 'PENDING',
        },
      });
    }

    return {
      order,
      payment,
      keyId: this.configService.get('RAZORPAY_KEY_ID'),
    };
  }

  async verifyPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ) {
    const message = `${razorpayOrderId}|${razorpayPaymentId}`;
    const signature = crypto
      .createHmac('sha256', this.configService.get('RAZORPAY_KEY_SECRET'))
      .update(message)
      .digest('hex');

    if (signature !== razorpaySignature) {
      throw new BadRequestException('Invalid payment signature');
    }

    return true;
  }

  async confirmPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ) {
    await this.verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);

    const payment = await this.prisma.payment.findFirst({
      where: { razorpayOrderId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        razorpayPaymentId,
        razorpaySignature,
        status: 'CAPTURED',
      },
    });

    // Update campaign status
    await this.prisma.campaign.update({
      where: { id: payment.campaignId },
      data: { status: 'PAYMENT_PENDING' },
    });

    return updatedPayment;
  }

  async getPaymentById(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async getCampaignPayment(campaignId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { campaignId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async getUserPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      include: { campaign: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async handleWebhook(event: any) {
    if (event.event === 'payment.authorized') {
      const { razorpay_order_id, razorpay_payment_id } = event.payload.payment.entity;
      await this.confirmPayment(razorpay_order_id, razorpay_payment_id, '');
    }

    if (event.event === 'payment.failed') {
      const { razorpay_order_id } = event.payload.payment.entity;
      const payment = await this.prisma.payment.findFirst({
        where: { razorpayOrderId: razorpay_order_id },
      });

      if (payment) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });
      }
    }
  }
}
