const xml2js = require('xml2js-es6-promise');

// Docs on event and context https://www.netlify.com/docs/functions/#the-handler-method
const feedUrl = {
  done: "https://oku.club/rss/collection/zQtTo",
  todo: "https://oku.club/rss/collection/JSKHS",
  doing: "https://oku.club/rss/collection/2f67M",
};

const formatBook = (book) => ({
  title: book.title[0],
  author: book["dc:creator"][0]["_"],
  guid: book.guid[0],
  date: book.pubDate[0],
});

const handler = async (event) => {
  try {
    const status = event.queryStringParameters.status || 'doing';

    const res = await fetch(feedUrl[status]);
    const text = await res.text();
    const data = await xml2js(text);
    console.log(data.rss.channel);
    const lastBuilt = data.rss.channel[0].lastBuildDate[0];

    return {
      statusCode: 200,
      body: JSON.stringify({
        status,
        lastBuilt,
        items: data.rss.channel[0].item.map(formatBook),
      }),
      // // more keys you can return:
      // headers: { "headerName": "headerValue", ... },
      // isBase64Encoded: true,
    }
  } catch (error) {
    return { statusCode: 500, body: error.toString() }
  }
}

module.exports = { handler }
