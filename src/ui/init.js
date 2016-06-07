/* global module */
var UI = require('ui');
var Feature = require('platform/feature');

// Reusable card template
var card = new UI.Card({
  status: {
    color: 'white',
    backgroundColor: Feature.color('electric-ultramarine', 'black'),
    separator: 'none',
  },
  title: 'LOCOMO',
  icon: 'images/train.png',
  subtitle: '',
  subtitleColor: Feature.color('electric-ultramarine', 'black'),
  body: 'Add your home and work stop to get started'
});

module.exports = {
  card: card
};
