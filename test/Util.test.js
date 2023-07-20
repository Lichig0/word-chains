const util = require("../src/Util");

const ONE_PIPE =  'This only has one || spoiler pipe in it.';
const TWO_PIPE = 'This has a whole || spoiler segment || in it.';
const THREE_PIPE = 'This has || a spoiler segment || but has a || extra bit.';
const FOUR_PIPE = 'This || has two || entire || spoiler || segments.';
const FIVE_PIPE = 'This || has two || entire || spoiler || segments but with one || more.';


test('Catch one pipe', () => {
  expect(util.hasPairs(ONE_PIPE)).toEqual(false);
});

test('Catch two pipes', () => {
  expect(util.hasPairs(TWO_PIPE)).toEqual(true);
});

test('Catch three pipe', () => {
  expect(util.hasPairs(THREE_PIPE)).toEqual(false);
});

test('Catch four pipe', () => {
  expect(util.hasPairs(FOUR_PIPE)).toEqual(true);
});

test('Catch five pipe', () => {
  expect(util.hasPairs(FIVE_PIPE)).toEqual(false);
});
