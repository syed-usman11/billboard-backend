import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  async createPaymentOrder(
    @Body() body: { campaignId: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.createPaymentOrder(body.campaignId, userId);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  async verifyPayment(
    @Body()
    body: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
  ) {
    return this.paymentsService.confirmPayment(
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.razorpaySignature,
    );
  }

  @Get('campaign/:campaignId')
  @UseGuards(JwtAuthGuard)
  async getCampaignPayment(@Param('campaignId') campaignId: string) {
    return this.paymentsService.getCampaignPayment(campaignId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getUserPayments(@CurrentUser('id') userId: string) {
    return this.paymentsService.getUserPayments(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getPaymentById(@Param('id') id: string) {
    return this.paymentsService.getPaymentById(id);
  }

  @Post('webhook')
  async handleWebhook(@Body() event: any) {
    return this.paymentsService.handleWebhook(event);
  }
}
