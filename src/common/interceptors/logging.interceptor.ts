import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as util from 'util'; // Para colorir objetos se necessário, ou usar JSON.stringify

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, params } = request;
    const now = Date.now();

    // Separador visual bem chamativo (Inicio Request)
    console.log('\n' + '🔵'.repeat(5) + ' REQUEST ' + '🔵'.repeat(5));
    console.log(`🚀 ${method} ${url}`);

    if (Object.keys(params || {}).length) {
      console.log('📌 Paradms:', JSON.stringify(params, null, 2));
    }
    if (Object.keys(query || {}).length) {
      console.log('📋 Query:', JSON.stringify(query, null, 2));
    }
    if (Object.keys(body || {}).length) {
      // Limitando body muito grande visualmente se necessário, mas usuário quer ver tudo
      console.log('📦 Body:', JSON.stringify(body, null, 2));
    }
    console.log('='.repeat(50));

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - now;
          console.log('\n' + '🟢'.repeat(5) + ` RESPONSE (${duration}ms) ` + '🟢'.repeat(5));
          console.log(JSON.stringify(data, null, 2));
          console.log('='.repeat(50) + '\n');
        },
        error: (err) => {
          const duration = Date.now() - now;
          console.log('\n' + '🔴'.repeat(5) + ` ERROR (${duration}ms) ` + '🔴'.repeat(5));
          console.log('❌ Message:', err.message);
          if (err.response) {
            console.log('📦 Error Response:', JSON.stringify(err.response, null, 2));
          }
          console.log('='.repeat(50) + '\n');
        }
      })
    );
  }
}
