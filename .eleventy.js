/* global module */

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy('styles.css');
  eleventyConfig.addPassthroughCopy('js');
  eleventyConfig.addPassthroughCopy('images');

  return {
    dir: {
      input: '.',
      includes: '_includes',
      output: '_site',
    },
    templateFormats: ['html'],
    htmlTemplateEngine: 'njk',
  };
};
