import 'package:flutter/widgets.dart';
import 'package:provider/provider.dart';
import '../../auth/presentation/providers/auth_provider.dart';

/// Resuelve el tipo real del panel a partir del flag `isNegocio` del tab.
///
/// Antes los tabs hardcodeaban `isNegocio ? 'NEGOCIO' : 'OFICIO'`, lo que
/// rompía a los proveedores **PROFESIONAL**: enviaban `type=OFICIO` al backend
/// (404 "Perfil de proveedor no encontrado" en analytics / me / cancel-plan) y
/// la sección de confianza leía `providerDataFor('OFICIO')` = null → caía a
/// "solicitar" aunque el perfil ya estuviera validado.
///
/// Para el panel individual distingue OFICIO vs PROFESIONAL usando el XOR de
/// perfiles del [AuthProvider] (nunca ambos a la vez). NEGOCIO se resuelve por
/// el flag del tab.
String resolvePanelType(BuildContext context, {required bool isNegocio}) {
  if (isNegocio) return 'NEGOCIO';
  return context.read<AuthProvider>().hasProfessionalProfile
      ? 'PROFESIONAL'
      : 'OFICIO';
}
