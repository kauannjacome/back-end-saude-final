import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { SuggestionService } from './suggestion.service';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';
import { TokenPayloadParam } from '../auth/param/token-payload.param';
import { PayloadTokenDto } from '../auth/dto/payload-token.dto';

@UseGuards(AuthTokenGuard)
@Controller('suggestion')
export class SuggestionController {
  constructor(private readonly suggestionService: SuggestionService) { }

  @Get()
  async getSuggestions(
    @Query('field') field: string,
    @TokenPayloadParam() token: PayloadTokenDto
  ) {
    if (!field) return [];
    return await this.suggestionService.getSuggestions(token.sub_id, token.user_id, field);
  }

  @Post()
  async trackSuggestion(
    @Body() body: { field: string; term: string },
    @TokenPayloadParam() token: PayloadTokenDto
  ) {
    if (!body.field || !body.term) return;
    await this.suggestionService.trackSuggestion(
      token.sub_id,
      token.user_id,
      body.field,
      body.term
    );
    return { success: true };
  }
}
