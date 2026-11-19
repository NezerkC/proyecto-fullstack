# BDY1103 - Taller de Base de Datos
## Evaluación Parcial N° 3: Diseño e Implementación de un Modelo de Datos No Relacional

- **Ponderación:** 30% de la nota final de la asignatura.
- **Tiempo Asignado:** 1 semana.
- **Modalidad:** Equipos de hasta 3 estudiantes (Taller de Alto Cómputo). Evaluación individual por situación.

---

## Estructura de la Evaluación

| Situación Evaluativa | Tipo | Ponderación | Entregable Clave |
| :--- | :--- | :--- | :--- |
| **Situación 1** | Entrega de Encargo (Informe) | **40%** | Informe técnico formal con diseño, justificación y operaciones CRUD probadas. |
| **Situación 2** | Presentación Ejecutiva | **60%** | Defensa oral individual y demostración técnica ante el docente. |

---

## 1. Situación Evaluativa 1: Entrega por Encargo (Informe Técnico)

El informe debe estructurarse obligatoriamente con los siguientes apartados:

### 1. Introducción
* **Descripción del Proyecto:** Breve descripción del caso *Sonido Vivo*, su objetivo de negocio y cómo la base de datos NoSQL resuelve las necesidades del catálogo/operaciones.
* **Alcance:** Definir el alcance del proyecto y el rol específico de la base de datos NoSQL.
* **Tecnologías Utilizadas:** Justificación de la base NoSQL elegida (MongoDB / Document Store).

### 2. Diferencias entre Bases de Datos Relacionales y No Relacionales
* Definición y características de bases relacionales (SQL / ACID / Esquema rígido).
* Definición y características de bases no relacionales (NoSQL / BASE / Esquema flexible).
* Ventajas y desventajas de cada paradigma.
* Situaciones y casos de uso en la industria donde una es preferible frente a la otra.
* Demostración de cómo coexisten en el proyecto semestral *Sonido Vivo*.

### 3. Elaboración de un Modelo de Datos No Relacional
* Descripción de los tipos de modelos NoSQL (Documentales, Clave-Valor, Columnas, Grafos).
* Justificación de la elección (Documental BSON/JSON con MongoDB) según los requerimientos de *Sonido Vivo*.
* Diagrama y descripción detallada de la estructura de las colecciones y esquemas implementados.

### 4. Manipulación de Bases de Datos No Relacionales con Operaciones CRUD
* Implementación demostrada de operaciones:
  * **Create:** Inserción de documentos complejos (productos, atributos polimórficos, reseñas).
  * **Read:** Consultas avanzadas, filtros por atributos anidados, proyecciones y agregaciones.
  * **Update:** Actualizaciones atómicas con operadores `$set`, `$inc`, `$push`.
  * **Delete:** Eliminación física o marcado lógico.
* Ejemplos de código ejecutables y capturas de resultados de prueba.
* Desafíos encontrados durante la implementación del CRUD.

### 5. Conclusión y Recomendaciones
* Resumen de puntos clave.
* Impacto de la solución en la escalabilidad y flexibilidad del negocio.
* Recomendaciones de evolución futura.

### 6. Anexos
* Código fuente completo de los scripts NoSQL.
* Diagramas de flujo y esquemas JSON.

---

## 2. Situación Evaluativa 2: Presentación Ejecutiva

Defensa individual con diapositivas concisas:
1. Explicación del problema de negocio y datos a procesar.
2. Comparativa conceptual Relacional vs. No Relacional (por qué Oracle para la venta/ACID y MongoDB para el catálogo/flexibilidad).
3. Estructura del modelo NoSQL implementado.
4. Demostración en vivo de las operaciones CRUD.
5. Conclusión y lecciones aprendidas.
