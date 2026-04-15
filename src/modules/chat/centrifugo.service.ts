import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class CentrifugoService {
  private readonly logger = new Logger(CentrifugoService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(private config: ConfigService) {
    this.apiUrl = this.config.get<string>('CENTRIFUGO_URL', 'http://localhost:8000');
    this.apiKey = this.config.get<string>('CENTRIFUGO_API_KEY', '');
  }

  async publish(channel: string, data: Record<string, any>): Promise<void> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/api/publish`,
        { channel, data },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
          },
          timeout: 5000,
        },
      );

      if (response.data?.error) {
        this.logger.error(
          `Centrifugo publish error on channel "${channel}": ${JSON.stringify(response.data.error)}`,
        );
      }
    } catch (err: any) {
      this.logger.error(`Failed to publish to Centrifugo channel "${channel}": ${err.message}`);
    }
  }
}
