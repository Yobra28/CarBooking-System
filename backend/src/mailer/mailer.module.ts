/* eslint-disable prettier/prettier */
import { MailerModule as NestMailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

@Module({
  imports: [
    NestMailerModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('SMTP_HOST'),
          port: configService.get<number>('SMTP_PORT'),
          secure: configService.get<number>('SMTP_PORT') === 465,
          auth:
            configService.get<string>('SMTP_USER') &&
            configService.get<string>('SMTP_PASS')
              ? {
                  user: configService.get<string>('SMTP_USER'),
                  pass: configService.get<string>('SMTP_PASS'),
                }
              : undefined,
          tls: {
            rejectUnauthorized: false,
          },
        },
        defaults: {
          from: `"Car Rental" <${configService.get<string>('FROM_EMAIL')}>`,
        },
        template: {
          dir: join(__dirname, '..', 'src', 'email', 'tempates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [NestMailerModule],
})
export class MailerModule {} 