import { describe, expect, it } from 'vitest';
import { parseLevel } from '../level';
import { NO_INPUT, TILE, type InputState } from '../types';
import { bodyAt, stepBody, type Body } from './physics';
import { makeWorld } from './world';

const DT = 1 / 60;

/** 12 rows; floor on row 11; spawn on row 10 at col 1; goal on row 10 at col 9. */
function levelRows(overrides: Record<number, string> = {}): string[] {
  const rows = Array.from({ length: 12 }, () => '..........');
  rows[10] = '.S.......G';
  rows[11] = '##########';
  for (const [r, v] of Object.entries(overrides)) rows[Number(r)] = v;
  return rows;
}

function setup(overrides: Record<number, string> = {}, hooks?: { waterY?: () => number }) {
  const level = parseLevel(levelRows(overrides));
  const world = makeWorld(level, hooks);
  const body = bodyAt(level.spawn);
  return { level, world, body };
}

function input(patch: Partial<InputState>): InputState {
  return { ...NO_INPUT, ...patch };
}

function run(body: Body, world: ReturnType<typeof makeWorld>, frames: number, inp: InputState) {
  let last = { died: false, jumped: false, landed: false };
  for (let i = 0; i < frames; i++) last = stepBody(body, inp, world, DT);
  return last;
}

describe('air jumps', () => {
  const press = input({ jump: true, jumpPressed: true });

  function inAir(maxAirJumps: number) {
    const { world, body } = setup();
    body.maxAirJumps = maxAirJumps;
    run(body, world, 5, NO_INPUT);
    stepBody(body, press, world, DT); // the normal jump off the floor
    for (let i = 0; i < 20; i++) stepBody(body, input({ jump: true }), world, DT); // rising, well clear of the floor
    expect(body.onGround).toBe(false);
    return { world, body };
  }

  it('does nothing by default: pressing jump in the air is ignored', () => {
    const { world, body } = inAir(0);
    const vy = body.vy;
    const res = stepBody(body, press, world, DT);
    expect(res.jumped).toBe(false);
    expect(body.vy).toBeGreaterThanOrEqual(vy);
  });

  it('gives one extra jump in mid-air when allowed', () => {
    const { world, body } = inAir(1);
    const res = stepBody(body, press, world, DT);
    expect(res.jumped).toBe(true);
    expect(body.vy).toBeLessThan(-200);
    expect(body.airJumps).toBe(1);
  });

  it('only one: a second press in the air does nothing', () => {
    const { world, body } = inAir(1);
    stepBody(body, press, world, DT);
    for (let i = 0; i < 10; i++) stepBody(body, input({ jump: true }), world, DT);
    const res = stepBody(body, press, world, DT);
    expect(res.jumped).toBe(false);
  });

  it('is restored on landing', () => {
    const { world, body } = inAir(1);
    stepBody(body, press, world, DT);
    for (let i = 0; i < 120; i++) stepBody(body, NO_INPUT, world, DT);
    expect(body.onGround).toBe(true);
    expect(body.airJumps).toBe(0);
  });

  it('carries the player higher than the first jump alone', () => {
    const single = inAir(0);
    const double = inAir(1);
    let minSingle = single.body.y;
    let minDouble = double.body.y;
    stepBody(double.body, press, double.world, DT);
    for (let i = 0; i < 90; i++) {
      stepBody(single.body, input({ jump: true }), single.world, DT);
      stepBody(double.body, input({ jump: true }), double.world, DT);
      minSingle = Math.min(minSingle, single.body.y);
      minDouble = Math.min(minDouble, double.body.y);
    }
    expect(minDouble).toBeLessThan(minSingle - 20);
  });

  it('does not use the air jump when jumping from the floor or just after leaving a ledge', () => {
    const { world, body } = setup();
    body.maxAirJumps = 1;
    run(body, world, 5, NO_INPUT);
    stepBody(body, press, world, DT);
    expect(body.airJumps).toBe(0);
    const ledge = setup();
    ledge.body.maxAirJumps = 1;
    ledge.body.onGround = false;
    ledge.body.coyote = 0.05;
    stepBody(ledge.body, press, ledge.world, DT);
    expect(ledge.body.airJumps).toBe(0);
  });
});

describe('stepBody', () => {
  it('falls and settles on the floor', () => {
    const { world, body } = setup();
    body.y -= 20;
    run(body, world, 60, NO_INPUT);
    expect(body.onGround).toBe(true);
    expect(body.y + body.h).toBeCloseTo(11 * TILE, 3);
  });

  it('reaches about three tiles when jump is held', () => {
    const { world, body } = setup();
    run(body, world, 5, NO_INPUT);
    const startY = body.y;
    let minY = startY;
    stepBody(body, input({ jump: true, jumpPressed: true }), world, DT);
    for (let i = 0; i < 90; i++) {
      stepBody(body, input({ jump: true }), world, DT);
      minY = Math.min(minY, body.y);
    }
    expect(startY - minY).toBeGreaterThan(44);
    expect(startY - minY).toBeLessThan(54);
  });

  it('jumps much lower when jump is released immediately', () => {
    const { world, body } = setup();
    run(body, world, 5, NO_INPUT);
    const startY = body.y;
    let minY = startY;
    stepBody(body, input({ jump: true, jumpPressed: true }), world, DT);
    for (let i = 0; i < 90; i++) {
      stepBody(body, NO_INPUT, world, DT);
      minY = Math.min(minY, body.y);
    }
    expect(startY - minY).toBeLessThan(20);
  });

  it('still jumps shortly after leaving a ledge (coyote time)', () => {
    const { world, body } = setup();
    body.onGround = false;
    body.coyote = 0.05;
    const res = stepBody(body, input({ jump: true, jumpPressed: true }), world, DT);
    expect(res.jumped).toBe(true);
  });

  it('does not jump in the air once coyote time has run out', () => {
    const { world, body } = setup();
    body.y -= 40;
    body.onGround = false;
    body.coyote = 0;
    const res = stepBody(body, input({ jump: true, jumpPressed: true }), world, DT);
    expect(res.jumped).toBe(false);
  });

  it('jumps on landing when jump was pressed slightly early (jump buffer)', () => {
    const { world, body } = setup();
    body.y -= 3;
    body.vy = 120;
    body.onGround = false;
    let jumped = stepBody(body, input({ jump: true, jumpPressed: true }), world, DT).jumped;
    for (let i = 0; i < 8 && !jumped; i++) {
      jumped = stepBody(body, input({ jump: true }), world, DT).jumped;
    }
    expect(jumped).toBe(true);
  });

  it('stops against a wall', () => {
    const { world, body } = setup({ 10: '.S..#....G' });
    run(body, world, 90, input({ right: true }));
    expect(body.x + body.w).toBeLessThanOrEqual(4 * TILE + 0.01);
    expect(body.vx).toBe(0);
  });

  it('dies on a hazard tile', () => {
    const { world, body } = setup({ 10: '.S.^.....G' });
    let died = false;
    for (let i = 0; i < 90 && !died; i++) died = stepBody(body, input({ right: true }), world, DT).died;
    expect(died).toBe(true);
  });

  it('dies when falling out of the bottom of the level', () => {
    const { world, body } = setup({ 11: '..........' });
    let died = false;
    for (let i = 0; i < 120 && !died; i++) died = stepBody(body, NO_INPUT, world, DT).died;
    expect(died).toBe(true);
  });

  it('dies when below the water line', () => {
    const { world, body } = setup({}, { waterY: () => 100 });
    const res = run(body, world, 5, NO_INPUT);
    expect(res.died).toBe(true);
  });

  it('is moved by an external push', () => {
    const { world, body } = setup();
    run(body, world, 5, NO_INPUT);
    const x0 = body.x;
    for (let i = 0; i < 10; i++) stepBody(body, NO_INPUT, world, DT, 60);
    expect(body.x - x0).toBeGreaterThan(9);
  });
});
