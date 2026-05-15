/// Constantes y funciones de formato compartidas para el módulo de referidos.
const kAppDownloadUrl = 'https://oficio-backend.onrender.com/download';

String formatNumber(int value) {
  // Inserta separador de miles cada 3 dígitos (formato es-PE: punto como
  // separador de miles, coma decimal — pero aquí solo enteros).
  final s = value.toString();
  final buf = StringBuffer();
  for (int i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buf.write(',');
    buf.write(s[i]);
  }
  return buf.toString();
}

String formatDate(DateTime d) {
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(d.day)}/${two(d.month)}/${d.year}';
}