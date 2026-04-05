<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9">

  <!-- Generic styling for both sitemapindex and urlset -->
  <xsl:template match="/">
    <xsl:variable name="pageTitle">
      <xsl:choose>
        <xsl:when test="/s:sitemapindex">really.lol Sitemap Index</xsl:when>
        <xsl:when test="contains(/s:urlset/s:url[1]/s:loc, '/post/')">really.lol Posts Sitemap</xsl:when>
        <xsl:when test="contains(/s:urlset/s:url[1]/s:loc, '/note/')">really.lol Notes Sitemap</xsl:when>
        <xsl:when test="contains(/s:urlset/s:url[1]/s:loc, '/photo/')">really.lol Photos Sitemap</xsl:when>
        <xsl:when test="contains(/s:urlset/s:url[1]/s:loc, '/highlight/')">really.lol Highlights Sitemap</xsl:when>
        <xsl:otherwise>really.lol Pages Sitemap</xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <html>
      <head>
        <meta charset="utf-8" />
        <title><xsl:value-of select="$pageTitle"/></title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", Arial, sans-serif; padding: 1.5rem; color: #19282f; background: #f5efd3; }
          h1 { margin: 0 0 1rem 0; }
          p { margin: 0 0 1rem 0; }
          table { border-collapse: collapse; width: 100%; }
          th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #19282f; }
          th { text-decoration: underline; }
          .muted { color: #555; font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <xsl:choose>
          <xsl:when test="/s:sitemapindex">
            <h1><xsl:value-of select="$pageTitle"/></h1>
            <p class="muted">This index links to the sectioned sitemaps.</p>
            <table>
              <tr><th>Location</th></tr>
              <xsl:for-each select="/s:sitemapindex/s:sitemap">
                <tr>
                  <td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td>
                </tr>
              </xsl:for-each>
            </table>
          </xsl:when>
          <xsl:otherwise>
            <h1><xsl:value-of select="$pageTitle"/></h1>
            <table>
              <tr>
                <th>URL</th>
                <th>Last Modified</th>
                <th>Priority</th>
              </tr>
              <xsl:for-each select="/s:urlset/s:url">
                <tr>
                  <td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td>
                  <td><xsl:value-of select="s:lastmod"/></td>
                  <td><xsl:value-of select="s:priority"/></td>
                </tr>
              </xsl:for-each>
            </table>
          </xsl:otherwise>
        </xsl:choose>
      </body>
    </html>
  </xsl:template>

</xsl:stylesheet>
