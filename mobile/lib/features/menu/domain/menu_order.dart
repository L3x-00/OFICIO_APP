// Helpers PUROS del carrito de la carta: arman el pedido por WhatsApp con
// varios platos en un solo mensaje. Sin dependencias de Flutter → testeable.

import 'models/menu_item_model.dart';

/// Una línea del pedido: el plato + la cantidad.
class CartLine {
  final MenuItemModel item;
  final int qty;
  const CartLine(this.item, this.qty);

  double get subtotal => item.effectivePrice * qty;
}

/// Extrae el número de WhatsApp (solo dígitos) de un link `wa.me/<num>?...`.
/// Devuelve null si no matchea (proveedor sin WhatsApp / oculto).
String? extractWhatsappNumber(String? whatsappOrderUrl) {
  if (whatsappOrderUrl == null) return null;
  final m = RegExp(r'wa\.me/(\d+)').firstMatch(whatsappOrderUrl);
  return m?.group(1);
}

/// Total del carrito.
double cartTotal(List<CartLine> lines) =>
    lines.fold(0, (sum, l) => sum + l.subtotal);

/// Cantidad total de unidades.
int cartCount(List<CartLine> lines) => lines.fold(0, (sum, l) => sum + l.qty);

/// Arma el texto del pedido (sin URL-encode).
String buildOrderMessage(String businessName, List<CartLine> lines) {
  final buffer = StringBuffer('Hola $businessName, quiero pedir:\n');
  for (final l in lines) {
    buffer.writeln(
      '- ${l.qty}x ${l.item.name} (S/ ${l.subtotal.toStringAsFixed(2)})',
    );
  }
  buffer.write('\nTotal: S/ ${cartTotal(lines).toStringAsFixed(2)}');
  return buffer.toString();
}

/// URL `wa.me` completa con el pedido prearmado (null si no hay número o
/// el carrito está vacío).
String? buildOrderUrl({
  required String? number,
  required String businessName,
  required List<CartLine> lines,
}) {
  if (number == null || lines.isEmpty) return null;
  final text = Uri.encodeComponent(buildOrderMessage(businessName, lines));
  return 'https://wa.me/$number?text=$text';
}
