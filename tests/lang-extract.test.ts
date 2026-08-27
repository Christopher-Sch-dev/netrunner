import { describe, it, expect } from 'vitest'
import { parseFile, parseDefinitions, parseImports, parseCalls } from '../src/context/parse'

/**
 * Wave E2 — Extracción de más lenguajes de grafo (Java/C#/PHP/Ruby).
 * TDD: estos tests definen el contrato (AC-L1..L3). RED antes de implementar.
 */
describe('lang-extract (Wave E2): Java/C#/PHP/Ruby', () => {
  it('java: defs (class + method) + import + call', async () => {
    const f = await parseFile(
      `package com.example;
import java.util.List;
public class UserService {
    public String getName() { return helper(); }
}`,
      'java',
    )
    expect(f.defs.map((d) => `${d.kind}:${d.name}`)).toEqual(['class:UserService', 'function:getName'])
    expect(f.imports).toContainEqual({ name: 'List', source: 'java.util.List' })
    expect(f.calls).toContainEqual({ caller: 'getName', callee: 'helper' })
  })

  it('java: interface + constructor como defs', async () => {
    const f = await parseFile(
      `interface Greeter { void greet(); }
class A { A() {} }`,
      'java',
    )
    expect(f.defs.map((d) => `${d.kind}:${d.name}`)).toEqual(['type:Greeter', 'function:greet', 'class:A', 'function:A'])
  })

  it('c_sharp: defs (class + method) + using + call', async () => {
    const f = await parseFile(
      `using System;
namespace MyApp {
    public class UserService {
        public string GetName() { return Helper(); }
    }
}`,
      'c_sharp',
    )
    expect(f.defs.map((d) => `${d.kind}:${d.name}`)).toEqual(['class:UserService', 'function:GetName'])
    expect(f.imports).toContainEqual({ name: 'System', source: 'System' })
    expect(f.calls).toContainEqual({ caller: 'GetName', callee: 'Helper' })
  })

  it('c_sharp: interface + constructor como defs', async () => {
    const f = await parseFile(
      `public interface IGreeter { void Greet(); }
public class A { public A() {} }`,
      'c_sharp',
    )
    expect(f.defs.map((d) => `${d.kind}:${d.name}`)).toEqual(['type:IGreeter', 'function:Greet', 'class:A', 'function:A'])
  })

  it('php: defs (class + method) + use + call', async () => {
    const f = await parseFile(
      `<?php
namespace App\\Service;
use App\\Models\\User;
class UserService {
    public function getName() { return helper(); }
}`,
      'php',
    )
    expect(f.defs.map((d) => `${d.kind}:${d.name}`)).toEqual(['class:UserService', 'function:getName'])
    expect(f.imports).toContainEqual({ name: 'User', source: 'App\\Models\\User' })
    expect(f.calls).toContainEqual({ caller: 'getName', callee: 'helper' })
  })

  it('php: interface + function_definition como defs', async () => {
    const f = await parseFile(
      `<?php
interface Greeter { public function greet(); }
function top() {}`,
      'php',
    )
    expect(f.defs.map((d) => `${d.kind}:${d.name}`)).toEqual(['type:Greeter', 'function:greet', 'function:top'])
  })

  it('ruby: defs (class + method) + require + call', async () => {
    const f = await parseFile(
      `require 'json'
class UserService
  def get_name
    helper()
  end
end`,
      'ruby',
    )
    expect(f.defs.map((d) => `${d.kind}:${d.name}`)).toEqual(['class:UserService', 'function:get_name'])
    expect(f.imports).toContainEqual({ name: 'json', source: 'json' })
    expect(f.calls).toContainEqual({ caller: 'get_name', callee: 'helper' })
  })

  it('ruby: module + singleton_method + require_relative', async () => {
    const f = await parseFile(
      `require_relative 'helper'
module Greeter
  def self.greet
    helper()
  end
end`,
      'ruby',
    )
    expect(f.defs.map((d) => `${d.kind}:${d.name}`)).toEqual(['class:Greeter', 'function:greet'])
    expect(f.imports).toContainEqual({ name: 'helper', source: 'helper' })
    expect(f.calls).toContainEqual({ caller: 'greet', callee: 'helper' })
  })

  it('ruby: require no genera call edge (es import)', async () => {
    const calls = await parseCalls(`require 'json'\ndef f\n  helper()\nend`, 'ruby')
    expect(calls).not.toContainEqual({ caller: null, callee: 'require' })
    expect(calls).toContainEqual({ caller: 'f', callee: 'helper' })
  })

  it('parseDefinitions/parseImports por lenguaje', async () => {
    const defs = await parseDefinitions('class A { void f() {} }', 'java')
    expect(defs.map((d) => d.kind)).toEqual(['class', 'function'])
    const imports = await parseImports(`using System;`, 'c_sharp')
    expect(imports).toContainEqual({ name: 'System', source: 'System' })
  })
})
