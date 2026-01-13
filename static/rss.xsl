<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <xsl:template match="/">
    <xsl:variable name="feedTitle">
      <xsl:choose>
        <xsl:when test="string-length(rss/channel/title) &gt; 0">
          <xsl:value-of select="rss/channel/title"/>
        </xsl:when>
        <xsl:otherwise>really.lol RSS</xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <html>
      <head>
        <meta charset="utf-8" />
        <title><xsl:value-of select="$feedTitle"/></title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", Arial, sans-serif; padding: 1.5rem; color: #19282f; background: #f5efd3; }
          h1 { margin: 0 0 0.5rem 0; }
          p { margin: 0 0 1rem 0; }
          table { border-collapse: collapse; width: 100%; }
          th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #19282f; vertical-align: top; }
          th { text-decoration: underline; }
          .muted { color: #555; font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <h1><xsl:value-of select="$feedTitle"/></h1>
        <p class="muted">
          <xsl:value-of select="rss/channel/description"/>
          <xsl:text> </xsl:text>
          <xsl:if test="string-length(rss/channel/lastBuildDate) &gt; 0">
            <xsl:text>Last build: </xsl:text>
            <xsl:value-of select="rss/channel/lastBuildDate"/>
          </xsl:if>
        </p>
        <table>
          <tr>
            <th>Title</th>
            <th>Published</th>
            <th>Link</th>
          </tr>
          <xsl:for-each select="rss/channel/item">
            <tr>
              <td><xsl:value-of select="title"/></td>
              <td><xsl:value-of select="pubDate"/></td>
              <td><a href="{link}"><xsl:value-of select="link"/></a></td>
            </tr>
          </xsl:for-each>
        </table>
      </body>
    </html>
  </xsl:template>

</xsl:stylesheet>
