# rol: Gherkin ejecutable de src/context/graph.ts + src/context/parse.ts (AC-1 indexación del grafo).
Feature: Indexación del grafo de conocimiento (index.db, AC-1/AC-5)

  Scenario: indexa un proyecto TS y extrae definiciones + llamadas
    Given un proyecto con un archivo TS que define "login" que llama a "authenticate"
    When indexo el proyecto con indexProject(dir)
    Then persisto un nodo function "login" y un nodo function "authenticate"
    And persisto un edge calls EXTRACTED desde "login" hacia authenticate
    And devuelvo los nodos y edges indexados

  Scenario: extrae imports como nodos kind import
    Given un archivo TS con "import { foo } from './dep'"
    When parseo sus definiciones
    Then obtengo un nodo import "foo" y un edge imports EXTRACTED hacia "./dep"

  Scenario: resuelve una llamada local como edge INFERRED
    Given un archivo con "function login(){ authenticate() }" y "function authenticate(){}"
    When parseo sus referencias
    Then obtengo un edge calls INFERRED desde login hacia la definición local authenticate

  Scenario: incremental re-indexa solo archivos cambiados
    Given un index.db existente con un archivo ya indexado
    When llamo indexProject(dir, { incremental: true }) sin cambiar el archivo
    Then no re-indexo ese archivo (mtime intacto)
    And devuelvo el grafo persistido

  Scenario: incremental detecta y re-indexa un archivo modificado
    Given un index.db existente con un archivo cuyo mtime cambio
    When llamo indexProject(dir, { incremental: true })
    Then re-indexo ese archivo (sus nodos/edges se reemplazan)

  Scenario: soporta múltiples lenguajes (typescript, javascript, python, go, rust)
    Given archivos fuente de python/go/rust con definiciones
    When indexo el proyecto
    Then extraigo nodos para cada definición del lenguaje correspondiente
