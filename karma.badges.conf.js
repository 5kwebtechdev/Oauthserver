module.exports = function (config) {
  require('./karma.conf.js')(config);
  // Layout assertions need a rendered document, not Karma's hidden context iframe.
  config.set({ client: { clearContext: false, runInParent: true }, reporters: ['progress'] });
};
