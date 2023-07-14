const hasPairs = (str) => {
  const needsPairs = ['"', '||' , '`'];
  // eslint-disable-next-line no-unused-vars
  const reg = new RegExp(/"[^"]*|'[^']*'|`[^`]*`|\([^)]*\)|\|\|[^||]*\|\|/gm);
  let  isPaired = true;

  needsPairs.forEach(char => {
    const splits = str.split(char).length;
    if (splits > 1 && splits % 2 === 0) {
      isPaired = false;
    }
  });
  return isPaired;
};

module.exports = {
  hasPairs
};
