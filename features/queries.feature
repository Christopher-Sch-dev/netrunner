# rol: Gherkin ejecutable de src/context/queries.ts (AC-5: explore/callers/callees/impact).
Feature: Queries del grafo de conocimiento (index.db)

  Scenario: explore matchea nodos por nombre y devuelve sus edges
    Given un proyecto con index.db que tiene un nodo "login" y un nodo "logout"
    When consulto explore("login")
    Then devuelvo el nodo "login" y los edges que lo tocan
    And truncated es false

  Scenario: explore trunca a 100 nodos
    Given un index.db con 120 nodos cuyo nombre contiene "fn"
    When consulto explore("fn")
    Then devuelvo 100 nodos
    And truncated es true

  Scenario: callers devuelve quién llama al símbolo
    Given edges app->core y util->core y core->other
    When consulto callers("def:core")
    Then devuelvo los nodos app y util
    And devuelvo los 2 edges hacia core

  Scenario: callees devuelve a quién llama el símbolo
    Given edges app->a y app->b y a->b
    When consulto callees("def:app")
    Then devuelvo los nodos a y b
    And devuelvo los 2 edges desde app

  Scenario: impact calcula blast radius acotado por depth
    Given una cadena app->a->b->c->d
    When consulto impact("def:app", depth=2)
    Then devuelvo los nodos app, a y b
    And devuelvo 2 edges

  Scenario: impact trunca si el blast radius excede 100 nodos
    Given root con 150 callees directos
    When consulto impact("def:root", depth=1)
    Then devuelvo 100 nodos
    And truncated es true
