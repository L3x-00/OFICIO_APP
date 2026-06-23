// Conversión de fechas a hora de PERÚ de forma EXPLÍCITA (UTC-5, sin horario
// de verano), sin depender del timezone del dispositivo.
//
// El backend devuelve las fechas en ISO con 'Z' (UTC). `DateTime.parse` las
// interpreta como UTC; `.toUtc()` lo asegura aunque venga con offset. Luego
// restamos 5h para obtener el reloj de pared de Lima.

const Duration kPeruOffset = Duration(hours: 5);

/// DateTime cuyos componentes (día/hora) son el reloj de pared de Perú.
DateTime peruLocal(DateTime dt) => dt.toUtc().subtract(kPeruOffset);

String _pad(int n) => n.toString().padLeft(2, '0');

/// "dd/MM/yyyy HH:mm" en hora de Perú a partir de un ISO del backend.
String fmtPeruDateTime(String iso) {
  final p = peruLocal(DateTime.parse(iso));
  return '${_pad(p.day)}/${_pad(p.month)}/${p.year} ${_pad(p.hour)}:${_pad(p.minute)}';
}

/// "dd/MM/yyyy" en hora de Perú.
String fmtPeruDate(String iso) {
  final p = peruLocal(DateTime.parse(iso));
  return '${_pad(p.day)}/${_pad(p.month)}/${p.year}';
}

/// "HH:mm" en hora de Perú.
String fmtPeruTime(String iso) {
  final p = peruLocal(DateTime.parse(iso));
  return '${_pad(p.hour)}:${_pad(p.minute)}';
}

/// Fecha de HOY en Perú en formato 'YYYY-MM-DD' (para el endpoint de slots).
String peruToday() {
  final p = peruLocal(DateTime.now());
  return '${p.year}-${_pad(p.month)}-${_pad(p.day)}';
}

/// Suma `days` a una fecha 'YYYY-MM-DD' y devuelve 'YYYY-MM-DD' (en Perú).
String peruDatePlus(String ymd, int days) {
  final parts = ymd.split('-').map(int.parse).toList();
  final d = DateTime.utc(
    parts[0],
    parts[1],
    parts[2],
  ).add(Duration(days: days));
  return '${d.year}-${_pad(d.month)}-${_pad(d.day)}';
}
