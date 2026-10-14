//------------------------------------------------------------------------------
// Private ---------------------------------------------------------------------
//------------------------------------------------------------------------------

function initMap()
  {
    var olReferences = 
    {
      "ol.Map": ol.Map,
      "ol.View": ol.View,
      "ol.Kinetic": ol.Kinetic,
      "ol.Collection": ol.Collection,
      "ol.proj.Projection": ol.proj.Projection,
      "ol.source.Vector": ol.source.Vector,
      "ol.source.OSM": ol.source.OSM,
      "ol.source.TileWMS": ol.source.TileWMS,
      "ol.layer.Vector": ol.layer.Vector,
      "ol.layer.Tile": ol.layer.Tile,
      "ol.interaction.defaults": ol.interaction.defaults,
      "ol.interaction.Interaction": ol.interaction.Interaction,
      "ol.interaction.DoubleClickZoom": ol.interaction.DoubleClickZoom,
      "ol.interaction.DragAndDrop": ol.interaction.DragAndDrop,
      "ol.interaction.KeyboardPan": ol.interaction.KeyboardPan,
      "ol.interaction.KeyboardZoom": ol.interaction.KeyboardZoom,
      "ol.interaction.MouseWheelZoom": ol.interaction.MouseWheelZoom,
      "ol.interaction.Pointer": ol.interaction.Pointer,
      "ol.interaction.DragBox": ol.interaction.DragBox,
      "ol.interaction.DragZoom": ol.interaction.DragZoom,
      "ol.interaction.DragPan": ol.interaction.DragPan,
      "ol.interaction.DragRotate": ol.interaction.DragRotate,
      "ol.interaction.DragRotateAndZoom": ol.interaction.DragRotateAndZoom,
      "ol.interaction.Draw": ol.interaction.Draw,
      "ol.interaction.Extent": ol.interaction.Extent,
      "ol.interaction.Modify": ol.interaction.Modify,
      "ol.interaction.PinchRotate": ol.interaction.PinchRotate,
      "ol.interaction.PinchZoom": ol.interaction.PinchZoom,
      "ol.interaction.Snap": ol.interaction.Snap,
      "ol.interaction.Translate": ol.interaction.Translate,
      "ol.interaction.Select": ol.interaction.Select,
      "ol.events.condition.altKeyOnly": ol.events.condition.altKeyOnly,
      "ol.events.condition.altShiftKeysOnly": ol.events.condition.altShiftKeysOnly,
      "ol.events.condition.always": ol.events.condition.always,
      "ol.events.condition.click": ol.events.condition.click,
      "ol.events.condition.doubleClick": ol.events.condition.doubleClick,
      "ol.events.condition.mouseOnly": ol.events.condition.mouseOnly,
      "ol.events.condition.never": ol.events.condition.never,
      "ol.events.condition.noModifierKeys": ol.events.condition.noModifierKeys,
      "ol.events.condition.platformModifierKeyOnly": ol.events.condition.platformModifierKeyOnly,
      "ol.events.condition.pointerMove": ol.events.condition.pointerMove,
      "ol.events.condition.primaryAction": ol.events.condition.primaryAction,
      "ol.events.condition.shiftKeyOnly": ol.events.condition.shiftKeyOnly,
      "ol.events.condition.singleClick": ol.events.condition.singleClick,
      "ol.events.condition.targetNotEditable": ol.events.condition.platformModifierKeyOnly,
      "ol.control.Control": ol.control.Control,
      "ol.control.Attribution": ol.control.Attribution,
      "ol.control.FullScreen": ol.control.FullScreen,
      "ol.control.MousePosition": ol.control.MousePosition,
      "ol.control.OverviewMap": ol.control.OverviewMap,
      "ol.control.Rotate": ol.control.Rotate,
      "ol.control.ScaleLine": ol.control.ScaleLine,
      "ol.control.Zoom": ol.control.Zoom,
      "ol.control.ZoomSlider": ol.control.ZoomSlider,
      "ol.control.ZoomToExtent": ol.control.ZoomToExtent,
      "ol.format.GeoJSON": ol.format.GeoJSON,
      "ol.loadingstrategy.all": ol.loadingstrategy.all,
      "undefined": undefined
    };
    
    this.setProperties = function(properties)
    {
      if(typeof properties === "undefined" || properties === null)
      {
        return this;
      }
      else if(typeof properties !== "object")
      {
        throw new TypeError();
      }
      
      for(var k in {map: null, view: null, bounds: null, sources: null, layers: null, overlays: null, interactions: null, controls: null})
      {
        if(typeof properties[k] !== "undefined")
        {
          this.properties[k] = properties[k];
        }
        this["update_" + k](this.properties[k]);
      }
      
      return this;
    };
    
    this.reset = function()
    {
      var properties = this.properties;
      
      for(var k in properties)
      {
        this["update_" + k](properties[k]);
      }
      
      return this;
    };
    
    this.update_map = function(properties)
    {
      if(typeof properties === "undefined" || properties === null)
      {
        return this;
      }
      
      document.body.innerHTML = "";
      this.map = new ol.Map(jsonToObject(properties, olReferences));
      this.map.setTarget(document.body);
      
      return this;
    };
    
    this.update_view = function(properties)
    {
      if(typeof properties === "undefined" || properties === null)
      {
        return this;
      }
      
      this.view = new ol.View(jsonToObject(properties, olReferences));
      this.map.setView(this.view);
      
      return this;
    };
    
    this.update_bounds = function(properties)
    {
      if(typeof properties === "undefined" || properties === null)
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
        return undefined;
      }
      this.map.getView().fit(this.bounds, this.map.getSize());
      
      return this;
    };
    
    this.update_sources = function(properties)
    {
      if(typeof properties === "undefined" || properties === null)
      {
        return this;
      }
      
      this.sources = jsonToObject(properties, olReferences);
      
      return this;
    };
    
    this.update_layers = function(properties)
    {
      if(typeof properties === "undefined" || properties === null)
      {
        return this;
      }
      
      var props = [];
      for(var i = 0; i < properties.length; i++)
      {
        props[i] = properties[i];
      }
      this.layers = jsonToObject(props, [olReferences, this.sources]) || [];
      this.map.getLayerGroup().setLayers(new ol.Collection(this.layers));
      
      return this;
    };
    
    this.update_overlays = function(properties)
    {
      if(typeof properties === "undefined" || properties === null)
      {
        return this;
      }
      
      this.overlays = jsonToObject(properties, olReferences);
      this.map.getOverlays().clear();
      for(var i = 0; i < this.overlays.length; i++)
      {
        this.map.addOverlay(this.overlays[i]);
      }
      
      return this;
    };
    
    this.update_interactions = function(properties)
    {
      if(typeof properties === "undefined" || properties === null)
      {
        return this;
      }
      
      this.interactions = jsonToObject(properties, olReferences);
      this.map.getInteractions().clear();
      for(var i = 0; i < this.interactions.length; i++)
      {
        this.map.addInteraction(this.interactions[i]);
      }
      
      return this;
    };
    
    this.update_controls = function(properties)
    {
      if(typeof properties === "undefined" || properties === null)
      {
        return this;
      }
      
      var props = [];
      for(var i = 0; i < properties.length; i++)
      {
        props[i] = properties[i];
      }
      this.controls = jsonToObject(props, olReferences);
      this.map.getControls().clear();
      for(var i = 0; i < this.controls.length; i++)
      {
        this.map.addControl(this.controls[i]);
      }
      
      return this;
    };
    
    var defaults = 
    {
      "map":
      {
        "loadTilesWhileAnimating": true,
        "loadTilesWhileInteracting": true,
        "controls":
        {
          "MassimilianoNardiObjectReference": "ol.Collection", "isConstructor": true, "newOperator": true, "recursion": true, "args":
          [
          ]
        },
        "interactions":
        {
          "MassimilianoNardiObjectReference": "ol.Collection", "isConstructor": true, "newOperator": true, "recursion": true, "args":
          [
          ]
        },
        "logo": false
      },
      "view":
      {
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
        "osm":
        {
          "MassimilianoNardiObjectReference": "ol.source.OSM", "isConstructor": true, "newOperator": true, "recursion": true, "args":
          [
            {
            }
          ]
        }
      },
      "layers":
      [
        {
          "MassimilianoNardiObjectReference": "ol.layer.Tile", "isConstructor": true, "newOperator": true, "recursion": true, "args":
          [
            {
              "name": "osm",
              "label": "OpenStreetMap",
              "source": {"MassimilianoNardiObjectReference": "osm"},
              "visible": true,
              "opacity": 1
            }
          ]
        }
      ],
      "controls":
      [
        {
          "MassimilianoNardiObjectReference": "ol.control.MousePosition", "isConstructor": true, "newOperator": true, "recursion": true, "args":
          [
            {
              "undefinedHTML": ""
            }
          ]
        },
        {
          "MassimilianoNardiObjectReference": "ol.control.OverviewMap", "isConstructor": true, "newOperator": true, "recursion": true, "args":
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
        },
        {
          "MassimilianoNardiObjectReference": "ol.control.ScaleLine", "isConstructor": true, "newOperator": true, "recursion": true, "args":
          [
            {
              "className_": "",
              "minWidth": 64,
              "units": "metric",
              "render_": "",
              "target_": ""
            }
          ]
        },
        {
          "MassimilianoNardiObjectReference": "ol.control.Zoom", "isConstructor": true, "newOperator": true, "recursion": true, "args":
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
        },
        {
          "MassimilianoNardiObjectReference": "ol.control.ZoomSlider", "isConstructor": true, "newOperator": true, "recursion": true, "args":
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
        },
        {
          "MassimilianoNardiObjectReference": "ol.control.ZoomToExtent", "isConstructor": true, "newOperator": true, "recursion": true, "args":
          [
            {
              "label": "E",
              "tipLabel": "Fit to extent"
            }
          ]
        }
      ]
    };
    
    var props = this.properties;
    this.properties = {};
    for(var k in defaults)
    {
      this.properties[k] = defaults[k];
    }
    if(typeof props === "undefined" || props === null)
    {
      this.reset();
    }
    else if(typeof props === "object")
    {
      this.setProperties(props);
    }
    else
    {
      throw new TypeError();
    }
  }

//------------------------------------------------------------------------------

function jsonToObject(json, references)
{
  if(typeof json === "undefined")
  {
    return undefined;
  }
  
  var jsonObject = json;
  
  if(typeof json === "string")
  {
    jsonObject = JSON.parse(json);
  }
  else if(typeof json !== "object")
  {
    throw new TypeError();
  }
  
  var refs = {};
  
  if(typeof references === "object")
  {
    var r = references;
    
    if(!Array.isArray(references))
    {
      r = [references];
    }
    
    for(var i = 0; i < r.length; i++)
    {
      var obj = r[i];
      
      if(typeof obj !== "object")
      {
        throw new TypeError();
      }
      
      for(var k in obj)
      {
        refs[k] = obj[k];
      }
    }
  }
  
  return _jsonToObject(jsonObject, refs);
}

function _jsonToObject(json, refs, path)
{
  var references = refs || {};
  var currentPath = path || "";
  
  if(typeof json !== "undefined" && json !== null && typeof json.MassimilianoNardiObjectReference !== "undefined")
  {
    var ref = references[json.MassimilianoNardiObjectReference];
    if(typeof ref !== "undefined")
    {
      if(json.isConstructor === true)
      {
        if(typeof ref !== "function")
        {
          throw new TypeError();
        }
        
        var args = json.args;
        if(typeof args === "undefined")
        {
          args = [];
        }
        else if(json.recursion === true)
        {
          args = [];
          for(var i = 0; i < json.args.length; i++)
          {
            args.push(_jsonToObject(json.args[i], references, currentPath + "." + i));
          }
        }
        
        if(json.newOperator === true)
        {
          references[currentPath] = Object.create(ref.prototype);
          ref.apply(references[currentPath], args);
          return references[currentPath];
        }
        else
        {
          references[currentPath] = ref.apply(undefined, args);
          return references[currentPath];
        }
      }
      else
      {
        references[currentPath] = ref;
        return references[currentPath];
      }
    }
    else
    {
      throw new ReferenceError();
    }
  }
  else
  {
    if(typeof json === "object" && json !== null)
    {
      var obj = {};
//      if(Array.isArray(json))
      if(json.constructor.name === "Array")
      {
        obj = [];
      }
      
      for(var k in json)
      {
        obj[k] = _jsonToObject(json[k], references, currentPath + "." + k);
      }
      
      references[currentPath] = obj;
      return references[currentPath];
    }
    else
    {
      references[currentPath] = json;
      return references[currentPath];
    }
  }
}

//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Map()
{
  return Map.Class.construct(this, arguments);
}

Class(Map)
.inherit(ui.Module)
.properties()
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

Map.prototype.construct = function(conf)
{
//  this.cssAdd("https://cdnjs.cloudflare.com/ajax/libs/openlayers/4.4.1/ol.css");
//  this.path("https://cdnjs.cloudflare.com/ajax/libs/openlayers/4.4.1/ol.js").read()
  this.cssAdd("https://cdnjs.cloudflare.com/ajax/libs/openlayers/4.6.5/ol.css");
  this.method("GET").url("/m/proxy/https://cdnjs.cloudflare.com/ajax/libs/openlayers/4.6.5/ol.js").read()
//  this.cssAdd("/pub/lib/ol/ol.css");
//  this.path("/pub/lib/ol/ol.js").read()
//  .data(function(){this.properties = conf; this.jsonToObject = m.util.jsonToObject;}).exec()
  .data(function(){this.properties = conf;}).exec()
  .data(jsonToObject.toString() + "; " + _jsonToObject.toString() + "; this.jsonToObject = jsonToObject;").exec()
  .data("(" + initMap.toString() + ")();").exec();
  
  this.node.style.width = "";
  this.node.style.height = "";
};

//------------------------------------------------------------------------------
