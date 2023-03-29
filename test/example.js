const Markov = require('../src/Markov');
const wiki = require('wikipedia');
const Chance = require('chance');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

const chance = new Chance();
const trimmer = new RegExp('==.*==|\n|^$','g');
const punctuation = new RegExp('[^.!?]*[.!?]', 'g');

const getwiki = async () => {
  try {
    const events = Object.values(await wiki.onThisDay({type: 'events'}))[0];
    // console.log(events);
    const dayAllContent = [];
    // const pageSummary = chance.pickone(Object.values(events)[0].pages);
    const pageSummary = Object.values(events)[0].pages[0];
    // Object.values(events)[0].pages.forEach(async pageSummary => {
    //   const page = await wiki.page(pageSummary.title);
    //   dayAllContent.push(await page.content());
    // });
    console.log('Fetched wiki article title:', pageSummary.title);
    const page = await wiki.page(pageSummary.title)
    // console.log('page', page);
    const content = await page.content();
    console.log('Content: ',content);
    // console.log(dayAllContent)
    return(content);
  } catch (error) {
    console.log(error);
  }
};

const getRandomWiki = async () => {
  try {
    const pageSummary = await wiki.random();
    console.log('Fetched wiki article title:', pageSummary.title);
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

const mChain = new Markov.MarkovChain();
console.log('Building chain....');

getwiki().then(async content => {
  const sentences = contentToArray(content);
  sentences.forEach(sentence => {
    mChain.addString(sentence, {source: 'Wiki', nsfw: true});
  })
  readline.question('Enter word to generate a sentence. \n>', async contains => {
    const start = Date.now();
    const exampleFilter = (result) => {
      /*
      {
        refs: {
          'On 6 March 2020, a mass shooting occurred in Kabul, Afghanistan.': {
            timestamp: 1678110023123,
            source: 'Wiki',
            nsfw: true,
            id: 'On 6 March 2020, a mass shooting occurred in Kabul, Afghanistan.'
          },
          ...
        text: 'On 6 March 2020, a ceremony to commemorate the 25th anniversary of the murder by Afghan politician Abdullah Abdullah, who escaped unharmed.'
      }
      */
      console.log(Object.values(result.refs));
      return result.text.split(' ').length >= 2
    };
    const newWiki = await mChain.generateSentence({intput: contains, filter: exampleFilter}).catch(console.error);
    console.debug(Date.now() - start);
    //Refs
    // console.debug(newWiki?.data.reduce((accum, curr) => [...accum, curr.refs], []));
    //Data
    // console.debug(newWiki?.data.reduce((accum, curr) => [...accum, curr.metadata], []));
    console.log(newWiki?.text);
    console.log(newWiki);
    readline.close();
  });
});
