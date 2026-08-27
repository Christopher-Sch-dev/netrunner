# Gherkin — Extracción de más lenguajes de grafo (Wave E2)

## SPEC (Mandamiento 0)
**Como** un agente que opera un proyecto conectado a NetRunner,
**quiero** que `parseFile`/`indexProject` extraigan definiciones, imports y llamadas
también de Java, C#, PHP y Ruby (además de TS/JS/Python/Go/Rust ya soportados),
**para** que la visión de Cris de UNA herramienta universal entienda CUALQUIER
proyecto, no solo los ecosistemas JS/Python/Go/Rust.

## Acceptance Criteria
- **AC-L1**: `parseDefinitions` extrae class/function/type/const de Java, C#, PHP y Ruby
  (nodos de definición de cada gramática tree-sitter).
- **AC-L2**: `parseImports` extrae `{ name, source }` de imports de Java (`import`),
  C# (`using`), PHP (`use`) y Ruby (`require`/`require_relative`).
- **AC-L3**: `parseCalls` extrae `{ caller, callee }` de llamadas de los 4 lenguajes,
  con la función envolvente como caller.
- **AC-L4**: `indexProject` indexa archivos `.java`, `.cs`, `.php`, `.rb` (EXT_TO_LANG).
- **AC-L5**: la gramática Ruby parsea sin crash (requiere web-tree-sitter ≥ 0.20.9).

## Escenarios
```
Feature: Extracción de más lenguajes de grafo (Wave E2)

  Scenario: Java — defs + import + call
    Given un archivo Java con clase UserService, método getName, import java.util.List
    When parseo con parseFile(code, 'java')
    Then extraigo class UserService y function getName
    And extraigo import { name: 'List', source: 'java.util.List' }
    And extraigo call { caller: 'getName', callee: 'helper' }

  Scenario: C# — defs + using + call
    Given un archivo C# con clase UserService, método GetName, using System
    When parseo con parseFile(code, 'c_sharp')
    Then extraigo class UserService y function GetName
    And extraigo import { name: 'System', source: 'System' }
    And extraigo call { caller: 'GetName', callee: 'Helper' }

  Scenario: PHP — defs + use + call
    Given un archivo PHP con clase UserService, método getName, use App\Models\User
    When parseo con parseFile(code, 'php')
    Then extraigo class UserService y function getName
    And extraigo import { name: 'User', source: 'App\Models\User' }
    And extraigo call { caller: 'getName', callee: 'helper' }

  Scenario: Ruby — defs + require + call
    Given un archivo Ruby con clase UserService, método get_name, require 'json'
    When parseo con parseFile(code, 'ruby')
    Then extraigo class UserService y function get_name
    And extraigo import { name: 'json', source: 'json' }
    And extraigo call { caller: 'get_name', callee: 'helper' }

  Scenario: indexProject indexa los 4 lenguajes
    Given un proyecto con archivos .java, .cs, .php, .rb
    When indexo con indexProject(dir)
    Then persisto nodos de los 4 lenguajes
```
