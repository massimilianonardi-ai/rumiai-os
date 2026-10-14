
var resolve = m.json.resolve;

var defaults = 
{
  "map":
  {
    "loadTilesWhileAnimating": true,
    "loadTilesWhileInteracting": true,
    "controls": ["@new", "ol.Collection"],
    "_interactions": ["@new", "ol.Collection"],
    "logo": false
  },
  "view":
  {
    "_extent": [1361930.7770808153, 5113187.846292134, 1425722.7048706159, 5175968.261836295],
    "zoom": 10,
    "minZoom": 5,
    "maxZoom": 22,
    "projection": "EPSG:3857"
  },
  "bounds":
  {
    "code": "EPSG:4326",
    "extent": [12.234432329644731,41.68015413832895,12.807484967014998,42.099983420974276]
  },
  "sources":
  {
    "osm": ["@new", "ol.source.OSM"]
  },
  "layers":
  [
    [
      "@new", "ol.layer.Tile",
      [
        {
          "name": "osm",
          "label": "OpenStreetMap",
          "source": "@ref:$.sources.osm",
          "visible": true,
          "opacity": 1
        }
      ]
    ]
  ],
  "controls":
  [
    [
      "@new", "ol.control.MousePosition",
      [
        {
          "undefinedHTML": ""
        }
      ]
    ],
    [
      "@new", "ol.control.OverviewMap",
      [
        {
          "collapsed": false,
          "collapseLabel_": "<<",
          "collapsible": false,
          "label_": ">>",
          "layers_": "null",
          "render_": "null",
          "target_": "null",
          "tipLabel": "Overview map",
          "view_": null
        }
      ]
    ],
    [
      "@new", "ol.control.ScaleLine",
      [
        {
          "className_": "",
          "minWidth": 64,
          "units": "metric",
          "render_": "",
          "target_": ""
        }
      ]
    ],
    [
      "@new", "ol.control.Zoom",
      [
        {
          "duration_": 250,
          "duration": 1500,
          "zoomInLabel_": "+",
          "zoomOutLabel_": "-",
          "zoomInTipLabel_": "Zoom in",
          "zoomOutTipLabel_": "Zoom out",
          "zoomInTipLabel": "Aumenta zoom",
          "zoomOutTipLabel": "Diminuisci zoom",
          "delta_": 1,
          "className_": "",
          "target_": ""
        }
      ]
    ],
    [
      "@new", "ol.control.ZoomSlider",
      [
        {
          "duration_": 200,
          "duration": 1500,
          "maxResolution": 0,
          "minResolution": 9000,
          "className_": "",
          "render_": ""
        }
      ]
    ],
    [
      "@new", "ol.control.ZoomToExtent",
      [
        {
          "extent": [1361930.7770808153, 5113187.846292134, 1425722.7048706159, 5175968.261836295],
          "label": "E",
          "tipLabel": "Fit to extent"
        }
      ]
    ]
  ],
  "_interactions":
  [
  ]
};

var sld_opacity = "";
sld_opacity += "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
sld_opacity += "<StyledLayerDescriptor xmlns=\"http://www.opengis.net/sld\" xmlns:ogc=\"http://www.opengis.net/ogc\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" version=\"1.1.0\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" units=\"mm\" xsi:schemaLocation=\"http://www.opengis.net/sld http://schemas.opengis.net/sld/1.1.0/StyledLayerDescriptor.xsd\" xmlns:se=\"http://www.opengis.net/se\">";
sld_opacity += "  <NamedLayer>";
sld_opacity += "    <Name>###NAME###</Name>";
sld_opacity += "    <UserStyle>";
sld_opacity += "      <FeatureTypeStyle>";
sld_opacity += "        <Rule>";
sld_opacity += "          <PolygonSymbolizer>";
sld_opacity += "            <Fill>";
sld_opacity += "              <SvgParameter name=\"fill\">#FFB300</SvgParameter>";
sld_opacity += "              <SvgParameter name=\"fill-opacity\">###OPACITY###</SvgParameter>";
sld_opacity += "            </Fill>";
sld_opacity += "            <Stroke>";
sld_opacity += "              <SvgParameter name=\"stroke\">#000000</SvgParameter>";
sld_opacity += "              <SvgParameter name=\"stroke-width\">0.26</SvgParameter>";
sld_opacity += "              <SvgParameter name=\"stroke-linejoin\">bevel</SvgParameter>";
sld_opacity += "            </Stroke>";
sld_opacity += "          </PolygonSymbolizer>";
sld_opacity += "        </Rule>";
sld_opacity += "      </FeatureTypeStyle>";
sld_opacity += "    </UserStyle>";
sld_opacity += "  </NamedLayer>";
sld_opacity += "</StyledLayerDescriptor>";

var sld_filter_by_field = "";
sld_filter_by_field += "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
sld_filter_by_field += "<StyledLayerDescriptor xmlns=\"http://www.opengis.net/sld\" xmlns:ogc=\"http://www.opengis.net/ogc\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" version=\"1.1.0\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" units=\"mm\" xsi:schemaLocation=\"http://www.opengis.net/sld http://schemas.opengis.net/sld/1.1.0/StyledLayerDescriptor.xsd\" xmlns:se=\"http://www.opengis.net/se\">";
sld_filter_by_field += "  <NamedLayer>";
sld_filter_by_field += "    <Name>###NAME###</Name>";
sld_filter_by_field += "    <UserStyle>";
sld_filter_by_field += "      <FeatureTypeStyle>";
sld_filter_by_field += "        <Rule>";
sld_filter_by_field += "          <PolygonSymbolizer>";
sld_filter_by_field += "            <Fill>";
sld_filter_by_field += "              <SvgParameter name=\"fill\">#FFB300</SvgParameter>";
sld_filter_by_field += "              <SvgParameter name=\"fill-opacity\">0.36</SvgParameter>";
sld_filter_by_field += "            </Fill>";
sld_filter_by_field += "            <Stroke>";
sld_filter_by_field += "              <SvgParameter name=\"stroke\">#000000</SvgParameter>";
sld_filter_by_field += "              <SvgParameter name=\"stroke-width\">0.26</SvgParameter>";
sld_filter_by_field += "              <SvgParameter name=\"stroke-linejoin\">bevel</SvgParameter>";
sld_filter_by_field += "            </Stroke>";
sld_filter_by_field += "          </PolygonSymbolizer>";
sld_filter_by_field += "        </Rule>";
sld_filter_by_field += "        <Rule>";
sld_filter_by_field += "          <ogc:Filter xmlns:ogc=\"http://www.opengis.net/ogc\">";
sld_filter_by_field += "            <ogc:PropertyIsEqualTo>";
sld_filter_by_field += "              <ogc:PropertyName>###FIELD###</ogc:PropertyName>";
sld_filter_by_field += "              <ogc:Literal>###VALUE###</ogc:Literal>";
sld_filter_by_field += "            </ogc:PropertyIsEqualTo>";
sld_filter_by_field += "          </ogc:Filter>";
sld_filter_by_field += "          <PolygonSymbolizer>";
sld_filter_by_field += "            <Fill>";
sld_filter_by_field += "              <SvgParameter name=\"fill\">#99042F</SvgParameter>";
sld_filter_by_field += "              <SvgParameter name=\"fill-opacity\">0.66</SvgParameter>";
sld_filter_by_field += "            </Fill>";
sld_filter_by_field += "            <Stroke>";
sld_filter_by_field += "              <SvgParameter name=\"stroke\">#00FF00</SvgParameter>";
sld_filter_by_field += "              <SvgParameter name=\"stroke-width\">10.26</SvgParameter>";
sld_filter_by_field += "              <SvgParameter name=\"stroke-linejoin\">bevel</SvgParameter>";
sld_filter_by_field += "            </Stroke>";
sld_filter_by_field += "          </PolygonSymbolizer>";
sld_filter_by_field += "        </Rule>";
sld_filter_by_field += "      </FeatureTypeStyle>";
sld_filter_by_field += "    </UserStyle>";
sld_filter_by_field += "  </NamedLayer>";
sld_filter_by_field += "</StyledLayerDescriptor>";

var isArray = function(o)
{
  return (typeof o === "object" && o !== null && o.constructor.name === "Array");
};

//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Map()
{
  return Map.Class.construct(this, arguments);
}

Class(Map)
.inherit(ElementConfInputStoreMapStore)
.compose("labels", {})
.property("references")
.property("conf", defaults)
.listener("conf", function(value, prev)
{
  this.dconf(value);
  this.eventNotify("ConfChanged", [value, prev]);
})
.property("dconf", resolve(m.util.clone(defaults)))
.setter("dconf", function(value)
{
  return resolve(m.util.clone(value, true), this.references() || (value ? value.references : null));
})
.event("ConfChanged", function(value, prev)
{
//  this.rebuild();
  this.reset();
})
.properties()
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

Map.prototype.construct = function(labels)
{
  this.labels = labels;
  
  this.rebuild();
};

//------------------------------------------------------------------------------

Map.prototype.update = function()
{
  this.rebuild();
};

//------------------------------------------------------------------------------

Map.prototype.rebuild = function()
{
  var _this = this;
  
  this.html("");
  
  this._menu = document.createElement("div");
  this._menu.classList.add("map_menu");
  this.node.appendChild(this._menu);
  
  this._map = document.createElement("div");
  this._map.classList.add("map_container");
  this.node.appendChild(this._map);
  
  this.infoContainer = new Element().parent(this); this.infoContainer.classes.add("map_info");
  var buttons = new Element().parent(this.infoContainer); buttons.classes.add("info_buttons");
  
  var search = new Button().parent(buttons).label(this.labels.info_search || "Search"); search.classes.add("icon-search");
  var result = new Button().parent(buttons).label(this.labels.info_result || "Result"); result.classes.add("icon-list");
  var info = new Button().parent(buttons).label(this.labels.info_info || "Info"); info.classes.add("icon-info");
  
  this._search = new Element().parent(this.infoContainer).visible(true); this._search.classes.add("search");
  this._result = new Element().parent(this.infoContainer).visible(false); this._result.classes.add("result");
  this._info = new Element().parent(this.infoContainer).visible(false); this._info.classes.add("info");
  
  this._search.show = function()
  {
    _this._search.visible(true);
    _this._result.visible(false);
    _this._info.visible(false);
  };
  
  this._result.show = function()
  {
    _this._search.visible(false);
    _this._result.visible(true);
    _this._info.visible(false);
  };
  
  this._info.show = function()
  {
    _this._search.visible(false);
    _this._result.visible(false);
    _this._info.visible(true);
  };
  
  search.register("click", function()
  {
    _this._search.show();
  });
  
  result.register("click", function()
  {
    _this._result.show();
  });
  
  info.register("click", function()
  {
    _this._info.show();
  });
  
  this.reset();
  
  return this;
};

//------------------------------------------------------------------------------

Map.prototype.reset = function()
{
//  var conf = this.conf();
  var conf = this.dconf();
  
  if(typeof conf === "undefined" || conf === null)
  {
    return this;
  }
  else if(typeof conf !== "object")
  {
    throw new TypeError();
  }
  
//  for(var k in conf)
  for(var k in {map: null, view: null, bounds: null, layers: null, overlays: null, interactions: null, controls: null, catalog: null})
  {
    this["update_" + k](conf[k]);
  }
  
  return this;
};

//------------------------------------------------------------------------------

Map.prototype.resetConf = function()
{
  this.dconf(this.conf());
  
  return this;
};

//------------------------------------------------------------------------------

Map.prototype.update_map = function(properties)
{
  if(typeof properties === "undefined" || properties === null)
  {
    return this;
  }
  
  var _this = this;
  
  this._map.innerHTML = "";
  
  this.map = new ol.Map(properties);
  this.map.setTarget(this._map);
  
  if(isNaN(this.map.getSize()[0]) || isNaN(this.map.getSize()[1]))
  {
    this.map = null;
//    this._map.style.position = "relative";
//    this._map.style.width = "800px";
    this._map.style.height = "400px";
    var intervalID = setInterval(function()
    {
      if(0 < _this._map.getBoundingClientRect().height)
      {
        clearInterval(intervalID);
        _this.reset();
      }
    }, 10);
    
    return this;
  }
  // internal layers
  this.ol = {};
  this.ol.selectionSource = new ol.source.Vector({});
  this.ol.selectionLayer = new ol.layer.Vector(
  {
    source: this.ol.selectionSource,
    visible: true,
    zIndex: Number.POSITIVE_INFINITY,
    updateWhileAnimating: true,
    updateWhileInteracting: true,
    style: new ol.style.Style(
    {
      fill: new ol.style.Fill(
      {
        color: "rgba(255, 255, 255, 0.6)"
      }),
      stroke: new ol.style.Stroke(
      {
        color: "rgba(153, 4, 47, 0.8)",
        width: 6
      }),
      image: new ol.style.Circle(
      {
        radius: 20,
        fill: new ol.style.Fill(
        {
        color: "rgba(0, 255, 0, 0.8)"
        })
      })
    })
  });
  this.ol.drawSource = new ol.source.Vector({wrapX: false});
  this.ol.drawLayer = new ol.layer.Vector(
  {
    source: this.ol.drawSource,
    visible: true,
    updateWhileAnimating: true,
    updateWhileInteracting: true,
    style: new ol.style.Style(
    {
      fill: new ol.style.Fill(
      {
        color: "rgba(255, 255, 255, 0.6)"
      }),
      stroke: new ol.style.Stroke(
      {
        color: "rgba(153, 4, 47, 0.8)",
        width: 2
      }),
      image: new ol.style.Circle(
      {
        radius: 7,
        fill: new ol.style.Fill(
        {
          color: "rgba(255, 255, 255, 0.4)"
        })
      })
    })
  });
  this.map.getLayers().push(this.ol.selectionLayer);
  this.map.getLayerGroup().getLayers().push(this.ol.drawLayer);
  
  this.map.on("singleclick", function(event){_this.mapInfo(event);});
  
  return this;
};

//------------------------------------------------------------------------------

Map.prototype.update_view = function(properties)
{
  if(typeof properties === "undefined" || properties === null || this.map === null)
  {
    return this;
  }
  
  this.view = new ol.View(properties);
  this.map.setView(this.view);
  
  return this;
};

//------------------------------------------------------------------------------

Map.prototype.update_bounds = function(properties)
{
  if(typeof properties === "undefined" || properties === null || this.map === null)
  {
    return this;
  }
  
  this.bounds = properties;
  if(properties.code !== this.map.getView().getProjection().getCode())
  {
    this.bounds = new ol.proj.transformExtent(properties.extent, properties.code, this.map.getView().getProjection().getCode());
  }
  if(isNaN(this.map.getSize()[0]) || isNaN(this.map.getSize()[1]))
  {
//    return undefined;
    return this;
  }
  this.map.getView().fit(this.bounds, this.map.getSize());
  
  return this;
};

//------------------------------------------------------------------------------

Map.prototype.update_layers = function(properties)
{
  if(typeof properties === "undefined" || properties === null || this.map === null)
  {
    return this;
  }
  
  var props = [];
  for(var i = 0; i < properties.length; i++)
  {
    props[i] = properties[i];
  }
  this.layers = properties || [];
  this.map.getLayerGroup().setLayers(new ol.Collection(this.layers));
  
  this.map.getLayerGroup().getLayers().push(this.ol.selectionLayer);
  
  return this;
};

//------------------------------------------------------------------------------

Map.prototype.update_overlays = function(properties)
{
  if(typeof properties === "undefined" || properties === null || this.map === null)
  {
    return this;
  }
  
  this.overlays = properties;
  this.map.getOverlays().clear();
  for(var i = 0; i < this.overlays.length; i++)
  {
    this.map.addOverlay(this.overlays[i]);
  }
  
  return this;
};

//------------------------------------------------------------------------------

Map.prototype.update_interactions = function(properties)
{
  if(typeof properties === "undefined" || properties === null || this.map === null)
  {
    return this;
  }
  
  this.interactions = properties;
  this.map.getInteractions().clear();
  for(var i = 0; i < this.interactions.length; i++)
  {
    this.map.addInteraction(this.interactions[i]);
  }
  
  return this;
};

//------------------------------------------------------------------------------

Map.prototype.update_controls = function(properties)
{
  if(typeof properties === "undefined" || properties === null || this.map === null)
  {
    return this;
  }
  
  var props = [];
  for(var i = 0; i < properties.length; i++)
  {
    props[i] = properties[i];
  }
  this.controls = properties;
  this.map.getControls().clear();
  for(var i = 0; i < this.controls.length; i++)
  {
    this.map.addControl(this.controls[i]);
  }
  
  return this;
};

//------------------------------------------------------------------------------

Map.prototype.update_catalog = function(properties)
{
  if(typeof properties === "undefined" || properties === null || this.map === null)
  {
    return this;
  }
  
  var catalog = {};
  for(var k in properties)
  {
    var key = k;
    if(key[0] === "/") key = key.substring(1);
    else throw new Error();
    
    if(key.endsWith("/")) key = key.substring(0, key.length - 1);
    
    key = key.split("/");
    
    var obj = catalog;
    for(var i = 0; i < key.length - 1; i++)
    {
      if(typeof obj[key[i]] === "undefined")
      {
        obj[key[i]] = new ol.layer.Group(
        {
          "visible": true,
          "opacity": 1
        });
        var keys = Array.from(key);
        keys.splice(i + 1);
        var path = "";
        for(var j = 0; j <= i; j++) path += "/" + key[j];
        obj[key[i]].setProperties({path: path, key: key[i], keys: keys, name: key[i], label: key[i]});
      }
      else if(obj[key[i]] instanceof ol.layer.Group)
      {
        
      }
      else if(!(obj[key[i]] instanceof ol.layer.Group)) throw new Error();
      
      obj[key[i]]._children = obj[key[i]]._children || {};
      obj = obj[key[i]]._children;
    }
    obj[key[key.length - 1]] = properties[k];
    
    properties[k].setProperties({path: k, key: key[key.length - 1], keys: key});
  }
  
  this.catalog = catalog;
  
  var addLayersToGroup = function(group)
  {
    if(group instanceof ol.layer.Group)
    {
      var a = group.getLayers().getArray();
      var c = group._children;
      for(var k in c)
      {
        a.push(c[k]);
        if(c[k] instanceof ol.layer.Group)
        {
          addLayersToGroup(c[k]);
        }
      }
      a.sort(function()
      {
        
      });
    }
    else if(typeof group === "object")
    {
      for(var k in group)
      {
        addLayersToGroup(group[k]);
      }
    }
    else
    {
      throw new Error();
    }
  };
  
  var sortLayersIntoGroup = function(group)
  {
    if(group instanceof ol.layer.Group)
    {
      var a = group.getLayers().getArray();
      a.sort(function(x, y)
      {
        var xp = x.getProperties();
        var yp = y.getProperties();
        if(typeof xp.priority === "number" && typeof yp.priority === "number")
        {
          if(xp.priority === yp.priority) return 0;
          else if(xp.priority < yp.priority) return -1;
          else if(xp.priority > yp.priority) return 1;
          else throw new Error();
        }
        else if(typeof xp.priority === "number")
        {
          if(xp.priority === 0) return 0;
          else if(xp.priority < 0) return -1;
          else if(xp.priority > 0) return 1;
          else throw new Error();
        }
        else if(typeof yp.priority === "number")
        {
          if(yp.priority === 0) return 0;
          else if(yp.priority < 0) return -1;
          else if(yp.priority > 0) return 1;
          else throw new Error();
        }
        if(xp.name && yp.name)
        {
          return (xp.name < yp.name ? -1 : (xp.name > yp.name ? 1 : 0));
        }
        
        return 0;
      });
      for(var i = 0; i < a.length; i++)
      {
        sortLayersIntoGroup(a[i]);
      }
    }
  };
  
  var group = this.map.getLayerGroup();
  group.setLayers(new ol.Collection([]));
  group._children = catalog;
  addLayersToGroup(group);
  sortLayersIntoGroup(group);
  
  this.updateUI();
  
  this.map.getLayerGroup().getLayers().push(this.ol.selectionLayer);
  
  return this;
};

//------------------------------------------------------------------------------

Map.prototype.updateUI = function()
{
  console.log("updateUI");
  
  this.updateUICatalog();
  
  return this;
};

//------------------------------------------------------------------------------

Map.prototype.updateUICatalog = function()
{
  console.log("updateUICatalog");
  
  // custom radio control with icons and/or text -> only icons: 
  // icon-layer for catalog, icon-eye for visible, icon-question fot query, icon-arrow-down for z-index
  // + one refresh button that calls this method
  // + one reset button that reloads conf (should keep a copy before resolve or copies of ol props)
  // one solution: conf is static but it updates dynamic_conf with a copy resolved
  // group has a label and down a container with some left margin
  // layer has a checkbox then a label then a dropdown toolbox with visible, query, z-index and opacity
  // 
  
  var _this = this;
  
  var buildAdvancedControlsDropDown = function(olElement, element)
  {
    var selectControl = new Element("input").parent(element); selectControl.node.type = "checkbox";
    selectControl.node.checked = olElement.getProperties().visible;
    selectControl.register("click", function(event)
    {
      event.stopPropagation();
    });
    selectControl.register("change", function(event)
    {
      olElement.setVisible(event.target.checked);
      olElement.setProperties({query: event.target.checked});
      console.log(olElement.getProperties());
      _this.map.updateSize();
    });
    var controlDropDown = new Element().parent(element); controlDropDown.classes.add("control_dropdown"); controlDropDown.classes.add("icon-arrow_drop_down");
    
    return controlDropDown;
  };
  
  var buildAdvancedControls = function(olElement, element)
  {
    var controlsContainer = new Element().parent(element).visible(false); controlsContainer.classes.add("controls_container");
//    var visibleControl = new Element("input").parent(controlsContainer); visibleControl.node.type = "checkbox";
//    visibleControl.node.checked = olElement.getProperties().visible;
//    visibleControl.register("change", function(event)
//    {
////      olElement.setZIndex(parseInt(event.target.value));
//      _this.map.updateSize();
//    });
    
    var queryLabel = new Element("label").text(_this.labels.controls_query || "Query").parent(controlsContainer);
    var queryControl = new Element("input").parent(controlsContainer); queryControl.node.type = "checkbox";
    queryControl.node.checked = typeof olElement.getProperties().query === "undefined" ? true : olElement.getProperties().query;
    queryControl.register("change", function(event)
    {
      olElement.setProperties({query: event.target.checked});
      _this.map.updateSize();
    });
    
    var zindexLabel = new Element("label").text(_this.labels.controls_zindex || "Order").parent(controlsContainer);
    var zindex = new Element("input").parent(controlsContainer); zindex.classes.add("control_zindex");
    zindex.node.type = "number"; zindex.node.step = "1";
    zindex.node.value = olElement.getProperties().zIndex || 0;
    zindex.register("change", function(event)
    {
      olElement.setZIndex(parseInt(event.target.value));
      _this.map.updateSize();
    });
    
    olElement.on("change:zIndex", function(event)
    {
      zindex.node.value = olElement.getProperties().zIndex || 0;
    });
    
    var visibilityLabel = new Element("label").text(_this.labels.controls_visibility || "Opacity").parent(controlsContainer);
    var visibility = new Element("input").parent(controlsContainer);
    visibility.node.type = "range"; visibility.node.min = "0"; visibility.node.max = "1"; visibility.node.step = "0.1";
    visibility.node.value = olElement.getProperties().opacity || 1;
    visibility.register("change", function(event)
    {
      olElement.setOpacity(parseFloat(event.target.value));
      _this.map.updateSize();
    });
    
    return controlsContainer;
  };
  
  var buildGroup = function(group, element, visibleFlag, queryFlag)
  {
    var container = new Element().parent(element); container.classes.add("group_label_container");
    var advancedControlsDropDown = buildAdvancedControlsDropDown(group, container);
    var groupLabel = new Element().parent(container).text(group.getProperties().label); groupLabel.classes.add("group_label");
    
    group.on("change:zIndex", function(event)
    {
      var prev = event.oldValue;
      var value = event.target.getProperties().zIndex;
      var c = event.target._children;
      for(var k in c)
      {
        if(typeof c[k].getProperties().zIndex === "undefined" || c[k].getProperties().groupZIndex === true) c[k].setProperties({zIndex: value, groupZIndex: true});
      }
    });
    
    var advancedControls = buildAdvancedControls(group, element);
    advancedControlsDropDown.register("click", function(event)
    {
      event.stopPropagation();
      advancedControls.visible(!advancedControls.visible());
      if(advancedControls.visible())
      {
        advancedControlsDropDown.classes.remove("icon-arrow_drop_down");
        advancedControlsDropDown.classes.add("icon-arrow_drop_up");
      }
      else
      {
        advancedControlsDropDown.classes.remove("icon-arrow_drop_up");
        advancedControlsDropDown.classes.add("icon-arrow_drop_down");
      }
    });
    
    var groupContainer = new Element().parent(element); groupContainer.classes.add("group_container");
    if(group.getProperties().open === true)
    {
      container.classes.add("icon-folder_open");
    }
    else
    {
      container.classes.add("icon-folder");
      groupContainer.visible(false);
    }
    container.register("click", function()
    {
      group.setProperties({open: !group.getProperties().open === true});
      if(group.getProperties().open === true)
      {
        container.classes.remove("icon-folder");
        container.classes.add("icon-folder_open");
        groupContainer.visible(true);
      }
      else
      {
        container.classes.remove("icon-folder_open");
        container.classes.add("icon-folder");
        groupContainer.visible(false);
      }
    });
    
    return groupContainer;
  };
  
  var buildLayer = function(group, element, visibleFlag, queryFlag)
  {
    var container = new Element().parent(element); container.classes.add("layer_label_container"); container.classes.add("icon-layers");
    var advancedControlsDropDown = buildAdvancedControlsDropDown(group, container);
    var layerLabel = new Element().parent(container).text(group.getProperties().label); layerLabel.classes.add("layer_label");
//    var infoButton = new Element().parent(container); infoButton.classes.add("icon-layers");
//    infoButton.register("click", function()
//    {
//      window.open(xml_metadata_url);
//    });
    
    var advancedControls = buildAdvancedControls(group, element);
    advancedControlsDropDown.register("click", function()
    {
      advancedControls.visible(!advancedControls.visible());
      if(advancedControls.visible())
      {
        advancedControlsDropDown.classes.remove("icon-arrow_drop_down");
        advancedControlsDropDown.classes.add("icon-arrow_drop_up");
      }
      else
      {
        advancedControlsDropDown.classes.remove("icon-arrow_drop_up");
        advancedControlsDropDown.classes.add("icon-arrow_drop_down");
      }
    });
    
    var layerContainer = new Element().parent(element); layerContainer.classes.add("layer_container");
    
    return layerContainer;
  };
  
  var updateUICatalog = function(olElement, element, visibleFlag, queryFlag)
  {
    if(visibleFlag === true && olElement.getProperties().visible === false) return;
    if(queryFlag === true && olElement.getProperties().query === false) return;
    
    if(olElement instanceof ol.layer.Layer)
    {
      buildLayer(olElement, element, visibleFlag, queryFlag);
      
      return;
    }
    
    var groupContainer = buildGroup(olElement, element, visibleFlag, queryFlag);
    for(var k in olElement._children) updateUICatalog(olElement._children[k], groupContainer, visibleFlag, queryFlag);
  };
  
  var updateUICatalogVisibleZIndex = function(olElement, a)
  {
    if(olElement instanceof ol.layer.Layer)
    {
      var z = olElement.getProperties().zIndex || 0;
      if(!(a[z] instanceof ol.layer.Group))
      {
        a[z] = new ol.layer.Group({label: z, zIndex: z});
        a[z]._children = {};
      }
      a[z].getLayers().getArray().push(olElement);
      a[z]._children[olElement.getProperties().label] = olElement;
      
      return;
    }
    
    for(var k in olElement._children) updateUICatalogVisibleZIndex(olElement._children[k], a);
  };
  
  var element = this._menu;
  element.innerHTML = "";
  var group = this.map.getLayerGroup();
  
  var buttons = new Element().parent(element); buttons.classes.add("catalog_buttons");
  
  var filters = new Element().parent(buttons); filters.classes.add("filter_buttons");
  var catalog = new Button().parent(filters).label(this.labels.filters_catalog || "Layers"); catalog.classes.add("icon-layers");
  var visible = new Button().parent(filters).label(this.labels.filters_visible || "Visible"); visible.classes.add("icon-visibility");
  var query = new Button().parent(filters).label(this.labels.filters_query || "Queried"); query.classes.add("icon-help");
  var zindex = new Button().parent(filters).label(this.labels.filters_zindex || "zIndex"); zindex.classes.add("icon-swap_vert");
  
  var catalogContainer = new Element().parent(element); buttons.classes.add("catalog_container");
  
  catalog.register("click", function()
  {
    catalogContainer.html("");
    for(var k in group._children) updateUICatalog(group._children[k], catalogContainer);
  });
  
  visible.register("click", function()
  {
    catalogContainer.html("");
    for(var k in group._children) updateUICatalog(group._children[k], catalogContainer, true);
  });
  
  query.register("click", function()
  {
    catalogContainer.html("");
    for(var k in group._children) updateUICatalog(group._children[k], catalogContainer, null, true);
  });
  
  zindex.register("click", function()
  {
    catalogContainer.html("");
    var a = [];
    updateUICatalogVisibleZIndex(group, a);
//    for(var k in a) updateUICatalog(a[k], catalogContainer, null, true);
    for(var k in a)
    {
      updateUICatalog(a[k], catalogContainer, null, true);
    }
  });
  
  var resets = new Element().parent(buttons); resets.classes.add("reset_buttons");
//  var refresh = new Button().parent(resets).label(this.labels.refresh || "Refresh"); refresh.classes.add("icon-refresh");
  var reset = new Button().parent(resets).label(this.labels.reset || "Reset"); reset.classes.add("icon-restore");
  
  reset.register("click", function()
  {
    _this.resetConf();
//    _this.rebuild();
    _this.reset();
  });
  
//console.log(group);
//  updateUICatalog(group, catalogContainer);
  for(var k in group._children) updateUICatalog(group._children[k], catalogContainer);
  
  return this;
};

//------------------------------------------------------------------------------

Map.prototype.updateUIInfo = function(properties, info)
{
  console.log("updateUIInfo", properties, info);
  
  var _this = this;
  
  this._info.show();
  this._info.html("");
//  var title = new Element().parent(this._info).text(properties.label);
  
  var propertiesToUI = function(l, o, e)
  {
console.log(l, o, e);
    var c = new Element().parent(e); c.classes.add("result_info_container");
    var el = new Element().parent(c).text(l); el.classes.add("result_info_container_field_label");
    
    if(typeof o !== "object")
    {
      c.classes.add("result_info_container_field");
      var ei = new Element().parent(c).text(o); ei.classes.add("result_info_container_field_value");
      return;
    }
    
    for(var k in o) propertiesToUI(k, o[k], c);
  };
  
  var container = new Element().parent(this._info);
  propertiesToUI(properties.label, info, container);
  
  return this;
};

//------------------------------------------------------------------------------

Map.prototype.mapInfo = function(event)
{
  console.log("mapInfo", event);
  
  var _this = this;
  var coord = event.coordinate;
  
  this._result.html("");
  this._result.show();
  
  var queryLayers = function(olElement)
  {
    if(olElement.getProperties().query === false) return;
    
    if(olElement instanceof ol.layer.Layer)
    {
      _this.queryLayer(olElement, coord);
      
      return;
    }
    
    for(var k in olElement._children) queryLayers(olElement._children[k]);
  };
  
  var group = this.map.getLayerGroup();
  for(var k in group._children) queryLayers(group._children[k]);
  
  return this;
};

//------------------------------------------------------------------------------

Map.prototype.queryLayer = function(layer, coord)
{
//  console.log("queryLayer", layer, coord);
  
  var map = this.map;
  var view = map.getView();
  var viewres = view.getResolution();
  var proj = view.getProjection();
  
  var _this = this;
  var resultFunction = function(name, layer)
  {
    return function(data){_this.queryResult(data, name, layer);};
  };
  
  var props = layer.getProperties();
  var name = props.name;
  var source = props.source;
//console.log("queryLayer", name, source, props);
  if(typeof source.getFeatureInfoUrl === "function")
  {
//console.log("queryLayer - has info url", name, source, source.getParams(), props);
    var featureInfoUrl = source.getFeatureInfoUrl(coord, viewres, proj, 
    {
      INFO_FORMAT: "application/vnd.ogc.gml",
      QUERY_LAYERS: source.getParams().LAYERS,
      FEATURE_COUNT: 999
    });
    
    m.util.ajaxAdvanced(
    {
      params: {},
      parse: "mime",
      method: "GET",
      url: featureInfoUrl,
      success: resultFunction(name, layer),
      error: function(){console.log("error quering layer: " + name, this, arguments);},
      httpError: function(){console.log("http error quering layer: " + name, this, arguments);}
    });
  }
  
  return this;
};

//------------------------------------------------------------------------------

Map.prototype.queryResult = function(data, name, layer)
{
  var _this = this;
//  console.log("queryResult", name, layer, data);
//  var gml = (new DOMParser()).parseFromString(data, "application/xml");
//  console.log("queryResult", name, layer, gml);
  
  var formatName = "GML32";
  var format = new ol.format[formatName]();
  var features = format.readFeatures(data);
  if(features.length === 0)
  {
    formatName = "GML3";
    format = new ol.format[formatName]();
    features = format.readFeatures(data);
    if(features.length === 0)
    {
      formatName = "GML2";
      format = new ol.format[formatName]();
      features = format.readFeatures(data);
      if(features.length === 0)
      {
        formatName = "GML";
        format = new ol.format[formatName]();
        features = format.readFeatures(data);
        if(features.length === 0)
        {
          formatName = "WFS";
          format = new ol.format[formatName]();
          features = format.readFeatures(data);
          if(features.length === 0)
          {
            formatName = "WMSGetFeatureInfo";
            format = new ol.format[formatName]();
            features = format.readFeatures(data);
          }
        }
      }
    }
  }
//console.log("queryResult", name, layer, formatName, features);
  
  var createResult = function(g, b, p, f)
  {
console.log("result", f.getId(), f, g, p, b);
//window.f = f;
//window.p = p;
//window.g = g;
//window.b = b;
    var bounds = b;
    if(!isArray(b))
    {
      var _b = b.Box._content_.coordinates;
      var c = _b._content_.split(_b.ts);
      c[0] = c[0].split(_b.cs);
      c[1] = c[1].split(_b.cs);
      bounds = [parseFloat(c[0][0]), parseFloat(c[0][1]), parseFloat(c[1][0]), parseFloat(c[1][1])];
    }
//console.log(bounds);
    
    var feature = f;
    if(g.getCoordinates().length === 0)
    {
      var _b = b.Box._content_.coordinates;
      var c = _b._content_.split(_b.ts);
      c[0] = c[0].split(_b.cs);
      c[1] = c[1].split(_b.cs);
      var e = [parseFloat(c[0][0]), parseFloat(c[0][1]), parseFloat(c[1][0]), parseFloat(c[1][1])];
      var p1 = [e[0], e[1]]; var p2 = [e[2], e[1]]; var p3 = [e[2], e[3]]; var p4 = [e[0], e[3]];
      var ring1 = [p1, p2, p3, p4, p1];
      var Square = new ol.geom.Polygon([ring1]);
      feature = new ol.Feature(Square);
// todo launch request for get feature with feature-id that will replace this variable at completion
    }
    
    var r = new Element().parent(_this._result);
    
    var info = new Element().parent(r); info.classes.add("result_info_button");
    var i_label = layer.getProperties().label;
    var fields = layer.getProperties().fields;
    if(fields)
    {
      i_label += " - " + fields[0] + ": " + p[fields[0]];
      for(var i = 1; i < fields.length; i++)
      {
        i_label += ", " + fields[i] + ": " + p[fields[i]];
      }
    }
    info.text(i_label);
    info.register("click", function()
    {
      _this.ol.selectionSource.clear();
      _this.ol.selectionSource.addFeature(feature);
      _this.map.updateSize();
      
//p._test = {test_1: "test_label_1", test_obj: {file_label: "obj_files", files: ["file_1", "file_2", "file_3"]}, test_2: "test_label_2"};
      _this.updateUIInfo(layer.getProperties(), p);
    });
    
    var buttons = new Element().parent(r); buttons.classes.add("result_buttons");
    
    var z = new Button().parent(buttons); z.classes.add("icon-zoom_in");
    z.label(_this.labels.result_zoom || "zoom");
    z.register("click", function()
    {
      _this.ol.selectionSource.clear();
      _this.ol.selectionSource.addFeature(feature);
      _this.map.updateSize();
      
      _this.view.fit(bounds, _this.map.getSize());
      _this.view.setZoom(_this.view.getZoom() - 2);
    });
    
    var n = new Button().parent(buttons); n.classes.add("icon-center_focus_strong");
    n.label(_this.labels.result_closeup || "closeup");
    n.register("click", function()
    {
      _this.ol.selectionSource.clear();
      _this.ol.selectionSource.addFeature(feature);
      _this.map.updateSize();
      
      _this.view.fit(bounds, _this.map.getSize());
    });
    
    var d = new Button().parent(buttons); d.classes.add("icon-remove_circle");
    d.label(_this.labels.result_deselect || "deselect");
    d.register("click", function()
    {
      _this.ol.selectionSource.clear();
      _this.map.updateSize();
    });
  };
  
  for(var i = 0; i < features.length; i++)
  {
    var f = features[i];
    var p = f.getProperties();
    var g = p[f.getGeometryName()];
    delete p[f.getGeometryName()];
    var b = p.boundedBy;
    delete p.boundedBy;
    createResult(g, b, p, f);
  }
  
  return this;
};

//------------------------------------------------------------------------------
