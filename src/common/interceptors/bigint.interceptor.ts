import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function replaceBigInt(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(replaceBigInt);
  if (typeof value === 'object') {
    const out: any = {};
    for (const key of Object.keys(value)) {
      out[key] = replaceBigInt(value[key]);
    }
    return out;
  }
  return value;
}

@Injectable()
export class BigIntInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map(replaceBigInt));
  }
}
