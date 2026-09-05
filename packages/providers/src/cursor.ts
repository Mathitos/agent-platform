import {
  ProviderAdapter,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ProviderConfig,
  I18n,
} from '@loom/core';

export class CursorProvider extends ProviderAdapter {
  constructor(config: ProviderConfig) {
    super(config);
  }

  async chat(_request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const errorMsg = I18n.getLocale() === 'pt-BR'
      ? 'Provedor Cursor está BLOQUEADO conforme M0: sem API oficial documentada para acesso externo ao plano de assinatura. Use OPENAI_API_KEY ou configure um provedor OpenAI-compatível (Bionic/LM Studio) como alternativa.'
      : 'Cursor provider is BLOCKED per M0: no documented official API for external access to subscription plan. Use OPENAI_API_KEY or configure an OpenAI-compatible provider (Bionic/LM Studio) as a fallback.';

    throw new Error(errorMsg);
  }

  getName(): string {
    return 'Cursor';
  }

  static createStub(): CursorProvider {
    return new CursorProvider({ type: 'cursor' });
  }
}
