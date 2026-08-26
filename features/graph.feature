# Gherkin — Indexación del grafo (src/context/graph.ts)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto conectado a Netrunner,
**quiero** que `indexProject(projectDir)` recorra los archivos fuente, extraiga
símbolos/llamadas/imports con tree-sitter (parse.ts) y los persista en un grafo
local (`<proyecto>/.netrunner/index.db`),
**para** que `queries.ts` (explore/callers/callees/impact) responda en pocas
llamadas sin grep/read masivo.

## Acceptance Criteria
- **AC-G1**: crea las tablas `nodes(id,name,kind,file,line,endLine)` y
  `edges(from,to,kind,provenance)` si no existen (mismo schema que lee queries.ts).
- **AC-G2**: para cada archivo fuente, extrae definiciones → GraphNode y
  imports/llamadas → GraphEdge con provenance EXTRACTED/INFERRED.
- **AC-G3**: incremental: solo re-indexa archivos cuyo mtime cambió.
- **AC-G4**: devuelve `{ nodes, edges }` totales indexados.

## Escenarios
```
Feature: Indexación del grafo de conocimiento (AC-1/AC-5)

  Scenario: indexa un proyecto TS y extrae definiciones + llamadas
    Given un proyecto con un archivo TS que define "login" y llama "authenticate"
    When indexo con indexProject(dir)
    Then persisto nodos function "login" y function "authenticate"
    And persisto un edge calls EXTRACTED desde "login" hacia "authenticate"
    And devuelvo los nodos y edges indexados

  Scenario: extrae imports como nodos kind import
    Given un archivo TS con "import { foo } from './dep'"
    When indexo
    Then persisto un nodo import "foo" y un edge imports EXTRACTED hacia "./dep"

  Scenario: re-index con incremental=true no duplica
    Given un proyecto ya indexado
    When re-index con incremental=true sin cambios
    Entonces no duplica nodos (count estable)
```
