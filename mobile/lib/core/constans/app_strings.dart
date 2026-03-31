abstract class AppStrings {
  // Mensajes predefinidos para WhatsApp
  // El proveedor sabrá que el cliente viene desde la app
  static String whatsappMessage(String providerName) =>
      'Hola $providerName, te contacto desde la app OficioApp. '
      'Me gustaría consultarte sobre tu servicio.';
}
