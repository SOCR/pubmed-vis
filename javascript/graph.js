/*////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 PubMed Visualization
 Creators: Patrick Tan, Pratyush Pati, Gary Chen

 Editions:
 2015/09, by Alexandr Kalinin: fixed calls to new E-Utils PubMed API and processing of returned structure

 The PubMed Visualization applet is a graphical representation of the PubMed database of biomedical
 literature ranging from published journals and online books. The search criteria allows users
 to find articles based on titles, authors, and topics. The graph is rendered by the D3 JavaScript Library
 which displays your search item in the middle and the authors and co-authors related to it by the connected
 nodes. The size of the nodes varies depending how well the author or co-author is related with the searched
 item, such that closely related topics or authors and co-authors that often work together will appear larger.
 Users can use a mouse-over to amplify the node and a double-click searches the selected item, while rendering
 a new graph. Additionally, a right-click allows user to Google search the name which will be displayed in a new
 window or tab. Below the graph, the user is shown a data table consisting of titles, journal name, date of
 publication, and co-authors of the searched item. A single-click on the titles allows users to go directly to
 the article link on the PubMed website. The user is shown the first ten entries upon a search and has the
 option to browse additional entries by the numbered links below the data table.

 *//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

(function() {

  var LIST_AMOUNT = 10;
  var currentPage = 0;
  var currentBatch = 0;
  var totalCount = 0;
  var currentInc = LIST_AMOUNT * currentPage;
  var coauthorArray = [];
  var search_term = '';

  var tablePaginate = $(".paginate");
  var inputSearch = $(".inputSearch");
  var buttonSearch = $(".searchButton");
  var idChart = $(".chart");
  var iconLoadingBatch = $('.loadingBatch')
  var iconSearch = $('.searchIcon');
  var classSearch = "icon-search";
  var classRefresh = "icon-refresh icon-refresh-animate";

  $(document).ready(function() {

    window.onload = function() {
      tablePaginate.hide();
      inputSearch.focus();
    };

    buttonSearch.click(function() {
      search_term = inputSearch.val() ? inputSearch.val() : inputSearch.attr('placeholder');
      inputSearch.val(search_term);
      currentBatch = 0;
      currentInc = 0;
      clearActive();
      search();
    });

    $('.inputSearch').keydown(function(event){
      if(event.which == 13){
        buttonSearch.trigger('click');
        event.preventDefault();
      }
    });

    $('.chart').bind("contextmenu",function(e){
      return false; // disable the context menu
    });

    // Search feature
    function search() {

      var unbindPageBtn = $('.unbindPage');
      var prevBatchBtn = $('.prevBatch');
      var nextBatchBtn = $('.nextBatch');

      function Coauthor(name, number) {
        this.name = name;
        this.number = number;
      }

      var search_args = {
        'db': 'pubmed',
        'term': search_term,
        'retmode': 'json',
        'retstart': currentBatch * 100,
        'retmax': 100 + currentBatch * 100  // maximum number of results from Esearch
      };

      var summary_args = {
        'db': 'pubmed',
        'id': '',
        'retmode': 'json',
        'retstart': currentBatch * 100,
        'retmax': 100 + currentBatch * 100  // maximum number of results passed to Esummary
      };

      iconSearch.removeClass(classSearch).addClass(classRefresh);
      iconLoadingBatch.toggleClass('hide');
      tablePaginate.hide();

      // check if call is successful
      $.getJSON('http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?', search_args, function(search_data) {
        if(search_data.esearchresult) {
          if (search_data.esearchresult.error) {

            $(".articles").html('<p>' + 'Sorry - EntrezAjax failed with error '
              + search_data.esearchresult.error_message + '</p>');
            tablePaginate.hide();

          } else {

          totalCount = search_data.esearchresult.count;
          summary_args.id = search_data.esearchresult.idlist.toString();
          $.getJSON('http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?', summary_args,
            function(summary_data) {

              iconSearch.removeClass(classRefresh).addClass(classSearch);
              iconLoadingBatch.toggleClass('hide');
              tablePaginate.show();

              // for loop adding all coauthors to array
              coauthorArray = [];
              $.each(summary_data.result, function (i, item) {
                if (item.authors) {
                  for (i = 0; i < item.authors.length; i++) {
                    if (item.authors[i].name.toLowerCase() !== search_term.toLowerCase()) {
                      var authorListed = $.grep(coauthorArray, function (e) {
                        return e.name === item.authors[i].name;
                      });
                      if (authorListed.length === 0)
                        coauthorArray.push(new Coauthor(item.authors[i].name, 1));
                      else if (authorListed.length === 1)
                        authorListed[0].number++;
                    }
                  }
                } else
                  console.log('Item' + item + ' doesnt have authors');
              });

              changePagination();
              // unbind active links to results of search
              unbindPageBtn.unbind('click');
              prevBatchBtn.unbind('click');
              nextBatchBtn.unbind('click');
              $('.p1').addClass('active unbindPage');

              showData(summary_data, true);
              tree(summary_data, coauthorArray);

              // force page movement on pagination clicks
              unbindPageBtn.click(function(event) {
                var pageID = $(this).attr('id');
                var number = pageID.substring(1, pageID.length);
                number = parseInt(number) - 1;
                event.preventDefault();
                if (currentPage !== number) {
                  clearActive();
                  $(this).attr('class', 'active unbindPage '.concat(pageID.toString()));
                  currentPage = number;
                  currentInc = LIST_AMOUNT * currentPage;
                  showData(summary_data, false);
                  tree(summary_data, coauthorArray);
                }
              });
              prevBatchBtn.click(function(event) {
                event.preventDefault();
                if (currentBatch !== 0) {
                  currentInc = 0;
                  clearActive();
                  currentBatch--;
                  changePagination();
                  search();
                }
              });
              nextBatchBtn.click(function(event) {
                event.preventDefault();
                if (currentBatch * 100 <= totalCount) {
                  currentInc = 0;
                  clearActive();
                  currentBatch++;
                  changePagination();
                  search();
                }
              })
            });
          }
        } else {
          $(".articles").html('<p>' + 'Error: cannot retrieve data.' + '</p>');
          tablePaginate.hide();
        }
      })
    }

    // Display table of results
    function showData(data, page) {
      if(page) {
        tablePaginate.show();
        var size = data.result.uids.length;
        hider(size);
      }

      // create table to show data of articles
      var tablecontents = '';
      tablecontents = '<table> <tr> <th>Title</th> <th>Journal</th><th>Date</th><th>Coauthors</th> </tr>';

      var item = data.result;
      // create list of authors for each article
      for (var num = 0; num < LIST_AMOUNT && (currentBatch * 100 + currentInc + num) < totalCount; num ++) {
        var author_list = '';
        var currPaper = item[item.uids[currentInc + num]];
        for(var i = 0; i < currPaper.authors.length; i ++) {
          if(i !== 0)
            author_list += ', ';
          author_list += currPaper.authors[i].name;
        }
        var currPaperId = 0;
        for(i = 0; i < currPaper.articleids.length; i++) {
          if(currPaper.articleids[i].idtype == 'pubmed')
            currPaperId = currPaper.articleids[i].value;
        }
        if(num % 2 === 0)
          tablecontents += '<tr>';
        else
          tablecontents += '<tr class="alt">';

        tablecontents += '<td>' + '<a href=\'http://www.ncbi.nlm.nih.gov/pubmed/' + currPaperId + '\'>' +
          currPaper.title + '</a>' + '</td>';
        tablecontents += '<td>' + currPaper.fulljournalname + '</td>';
        tablecontents += '<td>' + currPaper.pubdate + '</td>';
        tablecontents += '<td>' + author_list + '</td>';
        tablecontents += '</tr>';
      }
      tablecontents += '</table>';

      $('.articles').html(tablecontents);
    }

    // Hides pagination numbers if over the limit
    function hider(size) {
      if(size <= 90)
        $('.p10').hide();
      else
        $('.p10').show();
      if(size <= 80)
        $('.p9').hide();
      else
        $('.p9').show();
      if(size <= 70)
        $('.p8').hide();
      else
        $('.p8').show();
      if(size <= 60)
        $('.p7').hide();
      else
        $('.p7').show();
      if(size <= 50)
        $('.p6').hide();
      else
        $('.p6').show();
      if(size <= 40)
        $('.p5').hide();
      else
        $('.p5').show();
      if(size <= 30)
        $('.p4').hide();
      else
        $('.p4').show();
      if(size <= 20)
        $('.p3').hide();
      else
        $('.p3').show();
      if(size <= 10)
        $('.p2').hide();
      else
        $('.p2').show();
      if(currentBatch === 0)
        $('.prevBatch').addClass('disabled');
      else
        $('.prevBatch').removeClass('disabled');
      if((currentBatch + 1) * 100 > totalCount)
        $('.nextBatch').addClass('disabled');
      else
        $('.nextBatch').removeClass('disabled');
    }

    function clearActive() {
      for(var i = 1; i <= 10; i++)
        $('.p' + i).attr('class', 'unbindPage');
    }

    function changePagination() {
      for(var i = 1; i <= 10; i++)
        $('.page' + i).html(i + 10 * currentBatch);
    }

    function tree(data, coauthorArray) {

      $(window).resize(function() {
        waitForFinalEvent(function() {
          removeGraph();
          tree(data, coauthorArray);
        }, 500, '0a1edaaa-3f4e-4a23-8bc2-7f6e1a5f35b1');
      });

      var removeGraph = function() {
        var svg = d3.select('#chart svg');
        svg.on('click', null);
        svg.on('dblclick', null);
        svg.on('mouseover', null);
        svg.on('mouseout', null);

        idChart.empty();
      };

      var makeDataSet = function () {
        var included = [];
        var first = true;
        var dataSet = '';
        dataSet += '{"name": "' + search_term + '", "size": 100000';
        if(data.result.uids.length !== 0) {
          dataSet += ',"children": [';
          // for each article
          for(var num = 0; (num < LIST_AMOUNT) && (currentBatch * 100 + currentInc + num) < totalCount; num++) {
            // find number of times author has worked with each coauthor
            var currPaper = data.result[data.result.uids[currentInc + num]];
            for(var i = 0; i < currPaper.authors.length; i++) {
              if(currPaper.authors[i].name.toLowerCase() !== search_term.toLowerCase()) {
                var checkAuthor = $.grep(included, function(e) { return e.name === currPaper.authors[i].name; });
                if(checkAuthor.length === 0) {
                  var authorListed = $.grep(coauthorArray, function(e) { return e.name === currPaper.authors[i].name; });
                  included.push(authorListed[0]);
                  if(first)
                    first = false;
                  else
                    dataSet += ',';
                  dataSet += '{"name": "' + currPaper.authors[i].name + '", "size": ' +
                    authorListed[0].number * 3000 + '}';
                }
              }
            }
          }
          dataSet += ']';
        }
        dataSet += '}';
        return dataSet;
      };

      removeGraph();

      // obtain data set of co-authors
      var dataSet = makeDataSet();

      // size of window graph is present
      var w = idChart.width(),
        h = idChart.height(),
        root;

      var force = d3.layout.force()
        .linkDistance(150)
        .charge(-600)
        .gravity(.05)
        .size([w, h]);

      var vis = d3.select("#chart").append("svg:svg")
        .attr("width", w)
        .attr("height", h);

      root = jQuery.parseJSON(dataSet);
      update();

      function update() {
        var nodes = flatten(root),
          links = d3.layout.tree().links(nodes);

        // Restart the force layout.
        force
          .nodes(nodes)
          .links(links)
          .start();

        // Update the links…
        var link = vis.selectAll("line.link")
          .data(links, function(d) { return d.target.id; });

        // Enter any new links.
        link.enter().insert("svg:line", ".node")
          .attr("class", "link")
          .attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

        // Exit any old links.
        link.exit().remove();

        // Update the nodes…
        var node = vis.selectAll("g.node")
          .data(nodes, function(d) { return d.id; });

        node.select("circle")
          .style("fill", color);

        // Enter any new nodes
        var nodeEnter = node.enter().append("svg:g")
          .attr("class", "node")
          .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
          .on("click", click)
          .on("contextmenu", rightclick)
          .on("dblclick", dblclick)
          .on("contextmenu", rightclick)
          .on("mouseover",mouseover)
          .on("mouseout",mouseout)
          .call(force.drag);
        // Circle characteristics
        nodeEnter.append("svg:circle")
          .attr("r", function(d) { return Math.sqrt(d.size) / 10 || 4.5; })
          .attr("original", function(d) { return Math.sqrt(d.size) / 10 || 4.5; })
          .attr("store", function(d) { return 3 * Math.sqrt(d.size) / 10 || 4.5; })
          .style("fill", color);
        // Text characteristics
        nodeEnter.append("svg:text")
          .attr("text-anchor", "middle")
          .attr("dy", ".35em")
          .text(function(d) { return d.name; });

        // Exit any old nodes.
        node.exit().remove();

        // Re-select for update.
        link = vis.selectAll("line.link");
        node = vis.selectAll("g.node");

        force.on("tick", function() {
          link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

          node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
        });
      }

      // Color of the Nodes.
      function color(d) {
        return d._children ? "#3182bd" : d.children ? "#c6dbef" : "#95d2ca";
      }

      // Toggle children on click.
      function click(d) {
        if (d.children) {
          d._children = d.children;
          d.children = null;
        } else {
          d.children = d._children;
          d._children = null;
        }
        update();
      }
      // Double Click Feature: Focus of the graph
      function dblclick(d) {
        currentBatch = 0;
        currentInc = 0;
        clearActive();
        inputSearch.val(d.name);
        buttonSearch.trigger("click");
      }
      // Right Click Feature: Link to author
      function rightclick(d) {
        var txt = encodeURIComponent(d.name);
        window.open("https://www.google.com/#q=" + txt);
        // win.focus();
      }

      function rightclick(d) {
        var txt = encodeURIComponent(d.name);
        window.open("https://www.google.com/#q=" + txt);
        // win.focus();
      }


      // Returns a list of all nodes under the root
      function flatten(root) {
        var nodes = [], i = 0;

        function recurse(node) {
          if (node.children) node.children.forEach(recurse);
          if (!node.id) node.id = ++i;
          nodes.push(node);
        }

        recurse(root);
        return nodes;
      }
      // When mouse inside the node
      function mouseover(d) {
        var newSize = d3.select(this).select("circle").attr("store");
        d3.select(this).select("circle").transition()
          .duration(500)
          .attr("r", newSize)
        d3.select(this.parentNode.appendChild(this));
        d3.select(this).select("text").transition()
          .duration(500)
          .style("font-size", "30px")
      }
      // When mouse outside the node
      function mouseout(d) {
        var newSize = d3.select(this).select("circle").attr("original");
        d3.select(this).select("circle").transition()
          .duration(500)
          .attr("r", newSize);
        d3.select(this).select("text").transition()
          .duration(500)
          .style("font-size", "10px")
      }

    }

    // Run-time check
    var waitForFinalEvent = (function() {
      var timers = {};
      return function (callback, ms, uniqueId) {
        if (!uniqueId) {
          uniqueId = 'Don\'t call this twice without a uniqueId';
        }
        if (timers[uniqueId]) {
          clearTimeout (timers[uniqueId]);
        }
        timers[uniqueId] = setTimeout(callback, ms);
      };
    })()

  });
})();
