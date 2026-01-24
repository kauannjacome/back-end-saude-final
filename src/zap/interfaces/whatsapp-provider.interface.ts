export interface IWhatsAppProvider {
  name: string;

  /**
   * Verifica o status da conexão.
   * @param instanceId Identificador da instância (Evolution) ou Phone ID (Official)
   * @param token Token de acesso ou API Key
   */
  checkStatus(instanceId: string, token: string): Promise<any>;

  /**
   * Inicia a conexão (Gera QR Code para não-oficiais).
   * Para API Oficial, isso pode apenas verificar as credenciais.
   */
  connect(instanceId: string, token: string): Promise<any>;

  /**
   * Desconecta ou remove a instância.
   */
  disconnect(instanceId: string, token: string): Promise<void>;

  /**
   * Envia uma mensagem de texto.
   */
  sendMessage(
    phone: string,
    message: string,
    instanceId: string,
    token: string
  ): Promise<any>;
}
