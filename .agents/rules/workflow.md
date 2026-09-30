---
trigger: manual
---

# Reglas de Flujo de Trabajo y Git (Sonido Vivo)

Basado en la arquitectura y protocolo oficial de `README.md`.

## 1. Regla Inquebrantable de Ramas
- **PROHIBIDO tocar o modificar archivos de código directamente en `main`**.
- Antes de escribir cualquier línea de código o editar archivos, el asistente DEBE comprobar la rama activa con `git branch --show-current`.
- Si se encuentra en `main`, debe advertir y conmutar a la rama correspondiente según la tarea antes de aplicar cualquier cambio.

## 2. Nomenclatura Obligatoria de Ramas
Formato estricto: `<tipo>/<alcance>`

### Tipos permitidos:
- `style/` : Modificaciones exclusivas de hojas de estilo (`css/styles.css`).
- `js/` : Modificaciones de scripts y lógica (`js/*.js`).
- `html/` : Marcado o estructura (`index.html`, `pages/*.html`).
- `assets/` : Recursos multimedia e imágenes (`assets/img/*`).
- `feat/` : Nuevas funcionalidades completas que cruzan múltiples capas.

### Alcance:
- `general` : Cambios globales, tokens de diseño, resets o utilidades compartidas.
- Sustantivo específico en minúsculas y kebab-case (ej. `catalogo`, `carrito`, `validaciones`, `login`).

## 3. Protocolo de Inicio de Tarea
1. Verificar si la rama adecuada ya existe local o remotamente:
   - Si existe: `git switch <tipo>/<alcance>`
   - Si no existe: sincronizar `main` (`git switch main && git pull --ff-only origin main`) y crear rama derivada: `git switch -c <tipo>/<alcance>`

## 4. Estándar de Commits (Conventional Commits)
Formato: `tipo(alcance): descripcion breve en imperativo y minusculas`
- Tipos: `style`, `feat`, `fix`, `refactor`, `perf`, `docs`, `chore`.
- Nunca agregar atribuciones de IA ("Co-Authored-By", etc.).

## 5. Protocolo de Integración
- Integrar siempre `main` dentro de la rama de trabajo antes de fusionar la rama hacia `main` para aislar y resolver posibles conflictos.

## 6. Apertura y Previsualización Local
- **PROHIBIDO usar subagentes de navegador automatizados con CDP (`browser_subagent`) para abrir archivos HTML locales**, ya que intentan engancharse a puertos de depuración locales (127.0.0.1/9222) que colisionan con procesos de Chrome existentes y abren múltiples ventanas en bucle.
- Para previsualizar o abrir cualquier página HTML (`index.html`, etc.), ejecutar directamente mediante el sistema operativo en PowerShell:
  ```powershell
  Start-Process "<ruta-al-archivo.html>"
  ```
  Esto garantiza apertura inmediata, limpia y en el navegador predeterminado del usuario sin ventanas fantasma ni bucles.
