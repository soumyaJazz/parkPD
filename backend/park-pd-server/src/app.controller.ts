import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public() // a liveness ping - has to answer before anyone has a token
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * What the platform's health check should point at.
   *
   * Public for the same reason as the root: a health check holds no token, and
   * an endpoint that answers 401 to the thing deciding whether to restart this
   * container is worse than no endpoint at all.
   */
  @Public()
  @Get('health')
  health() {
    return this.appService.checkHealth();
  }
}
