abstract class AppStrings {
  // Mensajes predefinidos para WhatsApp
  // El proveedor sabrá que el cliente viene desde la app
  static String whatsappMessage(String providerName) =>
      'Hola $providerName, te contacto desde ConfiServ. '
      'Me gustaría consultarte sobre tu servicio.';
}
