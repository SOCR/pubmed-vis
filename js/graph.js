//api key:f6bc08acc6c7dbd33c60f04ac9d55f38
LIST_AMOUNT = 10;
currentPage=0;

(function(){
  $(document).ready(function(){
    
    window.onload = function(){
        $('#previousButton').hide();
        $('#nextButton').hide();
      };

    $("#searchButton").click(function() {
        search();
      });

    function search(){
      var coauthorArray = new Array();
      function coauthor(name, number)
      {
        this.name = name;
        this.number = number;

      }
      var search_term = $("#inputSearch").val();
        args = {'apikey' : '191d24f81e61c107bca103f7d6a9ca10',
                'db'     : 'pubmed',
                'term'   : search_term,
                'retmax' : 500,          // maximum number of results from Esearch
                'max'    : 100,          // maximum number of results passed to Esummary
                'start'  : 0};
        $.getJSON('http://entrezajax.appspot.com/esearch+esummary?callback=?', args, function(data) {
          if(data.entrezajax.error == true) {
            $("#articles").html('<p>' + 'Sorry - EntrezAjax failed with error ' + data.entrezajax.error_message + '</p>');
            $('#previousButton').hide();
            $('#nextButton').hide();
            return;
          }

          coauthorArray = new Array();
          $.each(data.result, function(i, item){
            for(var i = 0; i < item.AuthorList.length; i ++) {
              if(item.AuthorList[i].toLowerCase() != search_term.toLowerCase()){
                var authorListed = $.grep(coauthorArray, function(e){ return e.name == item.AuthorList[i]; })
                if(authorListed.length == 0)
                  coauthorArray.push(new coauthor(item.AuthorList[i],1));
                else if (authorListed.length == 1)
                  authorListed[0].number++;
              }
            }
          })

          showData(data);
          tree(data, coauthorArray);
        });
    }

    function showData(data){
      $('#previousButton').show();
      $('#nextButton').show();
      var tablecontents = "";
      tablecontents = '<table> <tr> <th>Title</th> <th>Journal</th><th>Date</th><th>Coauthors</th> </tr>';
      var item = data.result;
      for (var num = 0; num < LIST_AMOUNT; num ++)
      {
        var author_list = '';
        for(var i = 0; i < item[num].AuthorList.length; i ++) {
          if(i != 0) {
            author_list += ', ';
          }
          author_list += item[num].AuthorList[i];
        }
        if(num % 2 == 0)
          tablecontents += "<tr>";
        else
          tablecontents += "<tr class='alt'>";
        tablecontents += "<td>" + '<a href=\'http://www.ncbi.nlm.nih.gov/pubmed/' + item[num].ArticleIds.pubmed + '\'>' + item[num].Title + '</a>' + "</td>";
        tablecontents += "<td>" + item[num].FullJournalName + "</td>";
        tablecontents += "<td>" + item[num].PubDate + "</td>";
        tablecontents += "<td>" + author_list + "</td>";
        tablecontents += "</tr>";
      }
      tablecontents += "</table>";
      
      document.getElementById("articles").innerHTML = tablecontents;
    }

    function tree(data, coauthorArray){
      $(window).resize(function() {
        waitForFinalEvent(function() {
          removeGraph();
          tree(data, coauthorArray);
        }, 500, '0a1edaaa-3f4e-4a23-8bc2-7f6e1a5f35b1');
      });

      var removeGraph = function() {
        svg = d3.select('#chart svg');
        svg.on('click', null);
        svg.on('dblclick', null);
        svg.on('mouseover', null);
        svg.on('mouseout', null);

        $('#chart').empty();
      }

      removeGraph();
      var dataSet = makeDataSet();
      function makeDataSet(){
        var dataSet='';
        dataSet += '{"name": "' + $("#inputSearch").val() + '", "size": 10000';
        if(data.result.length != 0)
        {
          dataSet += ',"children": [';
          for(var num = 0; num < LIST_AMOUNT; num++)
          {
            for(var i = 0; i < data.result[num].AuthorList.length; i++) {
              if(data.result[num].AuthorList[i].toLowerCase() != $("#inputSearch").val().toLowerCase()){
                var authorListed = $.grep(coauthorArray, function(e){ return e.name == data.result[num].AuthorList[i]; })
                if(num != LIST_AMOUNT - 1 || i != data.result[num].AuthorList.length - 1)
                  dataSet += '{"name": "' + data.result[num].AuthorList[i] + '", "size": ' + authorListed[0].number * 3000 + '},';
                else
                  dataSet += '{"name": "' + data.result[num].AuthorList[i] + '", "size": ' + authorListed[0].number * 3000 + '}';
              }
            }
          }
          dataSet += ']';
        }
        dataSet += '}';
        return dataSet;
      }
      var w = 960,
          h = 500,
          root;

      var force = d3.layout.force()
          .linkDistance(125)
          .charge(-200)
          .gravity(.05)
          .size([w, h]);

      var vis = d3.select("#chart").append("svg:svg")
          .attr("width", w)
          .attr("height", h);

      // d3.json("graph.json", function(json) {
      //   root = json;
      //   update();
      // });
  
      var json = jQuery.parseJSON(dataSet);
        root = json;
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
            .data(nodes, function(d) { return d.id; })

        node.select("circle")
            .style("fill", color);

        // Enter any new nodes.
        var nodeEnter = node.enter().append("svg:g")
            .attr("class", "node")
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
            .on("click", click)
            .on("dblclick", dblclick)
            .call(force.drag);

        nodeEnter.append("svg:circle")
            .attr("r", function(d) { return Math.sqrt(d.size) / 10 || 4.5; })
            .style("fill", color);

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

      // Color leaf nodes orange, and packages white or blue.
      function color(d) {
        return d._children ? "#3182bd" : d.children ? "#c6dbef" : "#fd8d3c";
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

      function dblclick(d) {
        $("#inputSearch").val(d.name);
        search();
      }

      // Returns a list of all nodes under the root.
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
    }
    var waitForFinalEvent = (function () {
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

  }); //document ready
})();