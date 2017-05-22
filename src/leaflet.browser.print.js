/**
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Igor Vladyka <igor.vladyka@gmail.com> (https://github.com/Igor-Vladyka/leaflet.browser.print)
**/

L.Control.BrowserPrint = L.Control.extend({
	options: {
		title: 'Print map',
		position: 'topleft',
        printLayer: null,
		printModes: ["Portrait", "Landscape", "Auto", "Custom"]
	},

	initialize: function (options) {
		this._appendControlStyles();
		L.Control.prototype.initialize.call(this, options);
	},

	onAdd: function () {

		var container = L.DomUtil.create('div', 'leaflet-control-browser-print leaflet-bar leaflet-control');
		L.DomEvent.disableClickPropagation(container);

		var icon = L.DomUtil.create('a', '', container);
		this.link = icon;
		this.link.id = "leaflet-browser-print";
		this.link.title = this.options.title;

		L.DomEvent.addListener(container, 'mouseover', this._displayPageSizeButtons, this);
		L.DomEvent.addListener(container, 'mouseout', this._hidePageSizeButtons, this);

		this.holder = L.DomUtil.create('ul', 'browser-print-holder', container);

		var domPrintModes = [];

		for (var i = 0; i < this.options.printModes.length; i++) {
			var mode = this.options.printModes[i];
			var normilizedName = mode[0].toUpperCase() + mode.substring(1).toLowerCase();

			if (this["_print" + normilizedName]) {
				var domMode = L.DomUtil.create('li', 'browser-print-mode', this.holder);

				domMode.innerHTML = normilizedName;

				L.DomEvent.addListener(domMode, 'click', this["_print" + normilizedName], this);

				domPrintModes.push(domMode);
			}
		}

		this.options.printModes = domPrintModes;


		setTimeout( function () {
			container.className += icon.clientWidth == 26 ? " v0-7" : " v1";
		}, 10);

		return container;
	},

    _displayPageSizeButtons: function() {

    	this.holder.style.marginTop = "-" + this.link.clientHeight - 1 + "px";

		if (this.options.position.indexOf("left") > 0) {

	        this.link.style.borderTopRightRadius = "0px";
	    	this.link.style.borderBottomRightRadius = "0px";

			this.holder.style.marginLeft = this.link.clientWidth + "px";

		} else {

			this.link.style.borderTopLeftRadius = "0px";
	    	this.link.style.borderBottomLeftRadius = "0px";

			this.holder.style.marginRight = this.link.clientWidth + "px";

		}

		this.options.printModes.forEach(function(mode){
			mode.style.display = "inline-block";
		});
    },

    _hidePageSizeButtons: function (){

    	this.holder.style.marginTop = "";

		if (this.options.position.indexOf("left") > 0) {

	    	this.link.style.borderTopRightRadius = "";
	    	this.link.style.borderBottomRightRadius = "";

			this.holder.style.marginLeft = "";

		} else {

	    	this.link.style.borderTopLeftRadius = "";
	    	this.link.style.borderBottomLeftRadius = "";

			this.holder.style.marginRight = "";
		}

		this.options.printModes.forEach(function(mode){
			mode.style.display = "";
		});
    },

    _printLandscape: function () {
		this._addPrintClassToContainer("leaflet-browser-print--landscape");
        this._print("Landscape");
    },

    _printPortrait: function () {
		this._addPrintClassToContainer("leaflet-browser-print--portrait");
        this._print("Portrait");
    },

    _printAuto: function () {
		this._addPrintClassToContainer("leaflet-browser-print--auto");

		this.options.autoBounds = this._getBoundsForAllVisualLayers();
		this._print(this._getPageSizeFromBounds(this.options.autoBounds));
    },

    _printCustom: function () {

		this._addPrintClassToContainer("leaflet-browser-print--custom");

		this._map.on('mousedown', this._startAutoPoligon, this);
		this._map.on('mouseup', this._endAutoPoligon, this);
    },

	_addPrintClassToContainer: function (printClassName) {
		var container = this._map.getContainer();

		if (container.className.indexOf(printClassName) === -1) {
			container.className += " " + printClassName;
		}
	},

	_removePrintClassFromContainer: function (printClassName) {
		var container = this._map.getContainer();

		if (container.className && container.className.indexOf(printClassName) > -1) {
			container.className = container.className.replace(" " + printClassName, "");
		}
	},

	_startAutoPoligon: function (e) {
		e.originalEvent.preventDefault();

		this._map.dragging.disable();

		this._map.off('mousedown', this._startAutoPoligon, this);

		this.options.custom = { start: e.latlng };
		this._map.on('mousemove', this._moveAutoPoligon, this);
	},

	_moveAutoPoligon: function (e) {
		if (this.options.custom) {
			e.originalEvent.preventDefault();
			if (this.options.custom.rectangle) {
				this._map.removeLayer(this.options.custom.rectangle);
			}

			this.options.custom.rectangle = L.rectangle([this.options.custom.start, e.latlng], { color: "gray", dashArray: '5, 10' });
			this.options.custom.rectangle.addTo(this._map);
		}
	},

	_endAutoPoligon: function (e) {

		e.originalEvent.preventDefault();
		this._map.off('mousemove', this._moveAutoPoligon, this);
		this._map.off('mouseup', this._endAutoPoligon, this);

		this._map.removeLayer(this.options.custom.rectangle);

		this.options.autoBounds = this.options.custom.rectangle.getBounds();
		this.options.custom = undefined;

		this._map.dragging.enable();

		this._print(this._getPageSizeFromBounds(this.options.autoBounds));

	},

	_getPageSizeFromBounds: function(bounds) {
		var height = Math.abs(bounds.getNorth() - bounds.getSouth());
		var width = Math.abs(bounds.getEast() - bounds.getWest());
		if (height > width) {
			return "Portrait";
		} else {
			return "Landscape";
		}
	},

    _setupMapSize: function (mapContainer, printSize) {
        switch (printSize) {
            case "Landscape":
                mapContainer.style.width = "1040px";
                mapContainer.style.height = "715px";
                break;
            default:
            case "Portrait":
                mapContainer.style.width = "850px";
                mapContainer.style.height = "1100px";
                break;
        }
    },

    _print: function (printSize) {
		var self = this;
        var mapContainer = this._map.getContainer();

        this.options.origins = {
            bounds: this._map.getBounds(),
            width: mapContainer.style.width,
            height: mapContainer.style.height,
            printCss: this._addPrintCss(printSize),
			printLayer: this._validatePrintLayer()
        };

		self._map.fire("browser-print-start", { printLayer: this.options.origins.printLayer });

        this._setupMapSize(mapContainer, printSize);

        this._map.invalidateSize({reset: true, animate: false, pan: false});
		this._map.fitBounds(this.options.autoBounds || this.options.origins.bounds);

		this.options.origins.interval = setInterval(function(){
			if (self.options.origins.printLayer._tilesToLoad < 1) {
				clearInterval(self.options.origins.interval);
				self._completePrinting(self);
			}
		}, 50);
    },

	_completePrinting: function (self) {

		setTimeout(function(){
			self._map.fire("browser-print", { printLayer: self.options.origins.printLayer });
			window.print();
			self._printEnd(self);
		}, 1000);
	},

    _getBoundsForAllVisualLayers: function () {
	    var fitBounds = null;

        // Getting all layers without URL -> not tiles.
        for (var layerId in this._map._layers){
            var layer = this._map._layers[layerId];
            if (!layer._url) {
                if (fitBounds) {
                    if (layer.getBounds) {
                        fitBounds.extend(layer.getBounds());
                    } else if(layer.getLatLng){
                        fitBounds.extend(layer.getLatLng());
                    }
                } else {
                    if (layer.getBounds) {
                        fitBounds = layer.getBounds();
                    } else if(layer.getLatLng){
                        fitBounds = L.latLngBounds(layer.getLatLng(), layer.getLatLng());
                    }
                }
            }
        }

		return fitBounds;
    },

    _printEnd: function (context) {

        var self = context;

		try {

	        if (self.options.prevLayers) {
	            self.options.prevLayers.forEach(function(l) { self._map.addLayer(l); });
	        }

	        if (self.options.printLayer) {
	            self._map.removeLayer(self.options.printLayer);
	        }

	        var mapContainer = self._map.getContainer();

	        mapContainer.style.width = self.options.origins.width;
	        mapContainer.style.height = self.options.origins.height;

	        self._map.invalidateSize();
	        self._map.fitBounds(self.options.origins.bounds);

			self.options.autoBounds = undefined;
	        self.options.origins.printCss.remove();

			if (self.options.origins.printLayer._tilesToLoad < 0) {
				self.options.origins.printLayer._reset();
			}

			self._removePrintClassFromContainer("leaflet-browser-print--landscape");
			self._removePrintClassFromContainer("leaflet-browser-print--portrait");
			self._removePrintClassFromContainer("leaflet-browser-print--auto");
			self._removePrintClassFromContainer("leaflet-browser-print--custom");

		} catch (exception){ console.info(exception); }
		finally {

			self._map.fire("browser-print-end", { printLayer: self.options.origins.printLayer });
        	self.options.origins = undefined;
		}
    },

    _validatePrintLayer: function() {
		var visualLayerForPrinting = null;

        var map = this._map;
        var allLayers = map._layers;

        this.options.prevLayers = [];

        if (this.options.printLayer) {
			visualLayerForPrinting = this.options.printLayer;

            for (var layerId in allLayers){
                var layer = allLayers[layerId];
                if (layer._url) {
                    this.options.prevLayers.push(layer);
                }
            }

            map.addLayer(this.options.printLayer);
        } else {
            for (var id in allLayers){
                var pLayer = allLayers[id];
                if (pLayer._url) {
                    visualLayerForPrinting = pLayer;
                }
            }
		}

        this.options.prevLayers.forEach(function(l){ map.removeLayer(l); });

		return visualLayerForPrinting;
    },

    _addPrintCss: function (printSize) {

        var printStyleSheet = document.createElement('style');
        printStyleSheet.setAttribute('type', 'text/css');
		printStyleSheet.innerHTML = '@media print { .leaflet-control-container > .leaflet-bottom.leaflet-left, .leaflet-control-container > .leaflet-top.leaflet-left, .leaflet-control-container > .leaflet-top.leaflet-right { display: none!important; } }';
		printStyleSheet.innerHTML += '@media print { .leaflet-popup-content-wrapper, .leaflet-popup-tip { box-shadow: none; } }';

        switch (printSize) {
            case "Landscape":
                printStyleSheet.innerText += "@media print { @page { size : landscape; }}";
                break;
            default:
            case "Portrait":
                printStyleSheet.innerText += "@media print { @page { size : portrait; }}";
                break;
        }

        var head = document.getElementsByTagName('head')[0];
        head.appendChild(printStyleSheet);

        return printStyleSheet;
    },

	_appendControlStyles:  function () {
		var printControlStyleSheet = document.createElement('style');
		printControlStyleSheet.setAttribute('type', 'text/css');

		printControlStyleSheet.innerHTML += " .leaflet-control-browser-print a { background: #fff url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3gcCCi8Vjp+aNAAAAGhJREFUOMvFksENgDAMA68RC7BBN+Cf/ZU33QAmYAT6BolAGxB+RrrIsg1BpfNBVXcPMLMDI/ytpKozMHWwK7BJJ7yYWQbGdBea9wTIkRDzKy0MT7r2NiJACRgotCzxykFI34QY2Ea7KmtxGJ+uX4wfAAAAAElFTkSuQmCC') no-repeat 5px; background-size: 16px 16px; display: block; border-radius: 4px; }";

		printControlStyleSheet.innerHTML += " .v0-7.leaflet-control-browser-print a#leaflet-browser-print { width: 26px; height: 26px; } .v1.leaflet-control-browser-print a#leaflet-browser-print { background-position-x: 7px; }";
		printControlStyleSheet.innerHTML += " .browser-print-holder { margin: 0px; padding: 0px; list-style: none; white-space: nowrap; } .browser-print-holder-left li:last-child { border-top-right-radius: 2px; border-bottom-right-radius: 2px; } .browser-print-holder-right li:first-child { border-top-left-radius: 2px; border-bottom-left-radius: 2px; }";
		printControlStyleSheet.innerHTML += " .browser-print-mode { display: none; background-color: #919187; color: #FFF; font: 11px/19px 'Helvetica Neue', Arial, Helvetica, sans-serif; text-decoration: none; padding: 4px 10px; text-align: center; } .v1 .browser-print-mode { padding: 6px 10px; } .browser-print-mode:hover { background-color: #757570; cursor: pointer; }";
		printControlStyleSheet.innerHTML += " .leaflet-browser-print--custom, .leaflet-browser-print--custom path { cursor: crosshair!important; }";

		var head = document.getElementsByTagName('head')[0];
        head.appendChild(printControlStyleSheet);
	}
});

L.browserPrint = function(options) {

	if(options && options.printModes && (!options.printModes.filter || !options.printModes.length)){
		throw "Please specify valid print modes for Print action. Example: printModes: ['Portrait', 'Landscape', 'Auto', 'Custom']";
	}

	return new L.Control.BrowserPrint(options);
};