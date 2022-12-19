const Markov = require('../src/Markov');
const wiki = require('wikipedia');
const Chance = require('chance');

const chance = new Chance();
const trimmer = new RegExp('==.*==|\n|^$','g');
const punctuation = new RegExp('[^.!?]*[.!?]', 'g');

const input = ['In common usage, randomness is the apparent or actual lack of pattern or predictability in events.',
'A random sequence of events, symbols or steps often has no order and does not follow an intelligible pattern or combination.',
'Individual random events are, by definition, unpredictable, but if the probability distribution is known, the frequency of different outcomes over repeated events (or "trials") is predictable.',
'For example, when throwing two dice, the outcome of any particular roll is unpredictable, but a sum of 7 will tend to occur twice as often as 4!',
'In this view, randomness is not haphazardness; it is a measure of uncertainty of an outcome.',
'Randomness applies to concepts of chance, probability, and information entropy.',
'The fields of mathematics, probability, and statistics use formal definitions of randomness!p',
'In statistics, a random variable is an assignment of a numerical value to each possible outcome of an event space.',
'This association facilitates the identification and the calculation of probabilities of the events.',
'Random variables can appear in random sequences.',
'A random process is a sequence of random variables whose outcomes do not follow a deterministic pattern, but follow an evolution described by probability distributions.',
'These and other constructs are extremely useful in probability theory and the various applications of randomness.',
'Randomness is most often used in statistics to signify well-defined statistical properties.',
'Monte Carlo methods, which rely on random input (such as from random number generators or pseudorandom number generators), are important techniques in science, particularly in the field of computational science.',
'By analogy, quasi-Monte Carlo methods use quasi-random number generators!',
'Random selection, when narrowly associated with a simple random sample, is a method of selecting items (often called units) from a population where the probability of choosing a specific item is the proportion of those items in the population.',
'For example, with a bowl containing just 10 red marbles and 90 blue marbles, a random selection mechanism would choose a red marble with probability 1/10.',
'Note that a random selection mechanism that selected 10 marbles from this bowl would not necessarily result in 1 red and 9 blue.',
'In situations where a population consists of items that are distinguishable, a random selection mechanism requires equal probabilities for any item to be chosen.',
'That is, if the selection process is such that each member of a population, say research subjects, has the same probability of being chosen, then we can say the selection process is random.'
]

const getwiki = async () => {
  try {
    const events = Object.values(await wiki.onThisDay({type: 'events'}))[0];
    // console.log(events);
    const dayAllContent = [];
    const pageSummary = chance.pickone(Object.values(events)[0].pages);
    // Object.values(events)[0].pages.forEach(async pageSummary => {
    //   const page = await wiki.page(pageSummary.title);
    //   dayAllContent.push(await page.content());
    // });
    const page = await wiki.page(pageSummary.title)
    // console.log('page', page);
    const content = await page.content();
    // console.log(content);
    // console.log(dayAllContent)
    return(content);
  } catch (error) {
    console.log(error);
  }
};

const getRandomWiki = async () => {
  try {
    const pageSummary = await wiki.random();
    console.log(pageSummary.title);
    const page = await wiki.page(pageSummary.title);
    return page.content()
  } catch (error) {
    console.error(error);
  }
};

const contentToArray = (wikiContent) => {
  const trimmed = wikiContent.split(trimmer).filter(blocks => blocks !== '');
  const sentences = trimmed.flatMap(block => block.match(punctuation));
  return sentences;
};

// const splitRegex = new RegExp(/[\n/?!;()"]/);
// const sentences = input.split(splitRegex);
const mChain = new Markov.MarkovChain();
console.log('Building chain....');
// mChain.addString(input);
// console.debug(mChain.chain);
// const newSentence = mChain.generateSentence('specific')
// console.log(newSentence);

getwiki().then(content => {

  // console.log(trimmed);
  // console.log(sentences)
  const sentences = contentToArray(content);
  // mChain.addString(sentences);
  const CONTAINS_WORD = 'in'
  // const newWiki = mChain.generateSentence(CONTAINS_WORD);
  //console.log(mChain.chain)
  // console.log(newWiki, ` | Includes '${CONTAINS_WORD}': `, newWiki.includes(CONTAINS_WORD))
});

getRandomWiki().then(content => {
  const sentences = contentToArray(content);
  mChain.addString(sentences);
  const newWiki = mChain.generateSentence();
  console.log(newWiki);
});
