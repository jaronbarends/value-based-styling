/*
 * valuebasedstyling.js
 * scans the tables in your document and assigns classes to the td's based on their numeric values
 * you should define css-rules for the minimum and maximum positive and negative values; the script will calculate and create rules for the intermediate classes
 * include this file at the end of your <body>
 * (if you include it earlier in the document, call the vbs.init function when the dom is ready)
 *
 * http://jaron.nl/blog/2009/value-based-styling/
*/
var vbs = {
	//configuration vars
	scales: 5,//number of value-scales (on either side of 0)
	cssSelectorPrefix: "",//prefix to be used for selector in all dynamically created styles for intermediate scales (for example for creating high enough specificity)
	
	//other vars - you'll probabaly won't want to change these
	posValMin: null,
	posValMax: null,
	negValMin: null,
	negValMax: null,//will be reused for every table
	fTables: null,
	
	posValMinColor: null,
	posValMaxColor: null,
	posValMinBgColor: null,
	posValMaxBgColor: null,
	posValMinFontSize: null,
	posValMaxFontSize: null,
	posValMinFontUnit: null,
	posValMaxFontUnit: null,
	
	negValMinColor: null,
	negValMaxColor: null,
	negValMinBgColor: null,
	negValMaxBgColor: null,
	negValMinFontSize: null,
	negValMaxFontSize: null,
	negValMinFontUnit: null,
	negValMaxFontUnit: null,
	
	init: function() {
		vbs.fTables = vbs.getElementsByClassName("vbs", "table");
		if (vbs.fTables.length > 0) {
			for (var i=0; i<vbs.fTables.length; i++) {
				var t = vbs.fTables[i];
				vbs.setMinMax(t);
				vbs.addTdClasses(t);
			}
			vbs.addScaleStyles();
		}
	},
	
	addScaleStyles: function() {
		//adds styles for all intermediate scales to head of document
		vbs.getScaleStyles();
		var posStylesCss = vbs.createScaleStyles("pos");
		var negStylesCss = vbs.createScaleStyles("neg");
		
		if (posStylesCss != "" || negStylesCss != "") {
			tdHeightCss = vbs.calcTdHeight();
			vbs.addCss(posStylesCss+negStylesCss+tdHeightCss);
		}
	},
	
	calcTdHeight: function() {
		//now create style to give each td the same height: the maximum used fontsize with a line-height of 1.4.
		//this will only work if all font-sizes are declared with the same units (i.e. px, em, 5)
		var height = "";
		var lineHeight = 1.6;
		var maxSize = null;
		if (vbs.posValMinFontUnit == vbs.posValMaxFontUnit && vbs.posValMinFontUnit !== null) {
			maxSize = Math.max(vbs.posValMinFontSize, vbs.posValMaxFontSize);
			height = lineHeight*maxSize+vbs.posValMinFontUnit;
		}
		if (height == "" || (vbs.negValMinFontUnit == vbs.negValMaxFontUnit && vbs.negValMinFontUnit !== null) ) {
			maxNegSize = Math.max(vbs.negValMinFontSize, vbs.negValMaxFontSize);
			maxSize = Math.max(maxSize,maxNegSize);
			if (vbs.posValMinFontUnit == null || vbs.posValMinFontUnit == vbs.negValMinFontUnit) {
				//then use this maxSize
				height = lineHeight*maxSize+vbs.negValMinFontUnit;
			}
		}
		var css = vbs.cssSelectorPrefix+".vbs td {height:"+height+";}";
		return (css);//on td's min-height doesn't work; however, height works the way you'ld expect min-height to
	},
	
	getScaleStyles: function() {
		//search for the styles for min and max values, and assign the to corresponding vars
		var stylesheets = document.styleSheets;
		for (var i=0; i<stylesheets.length; i++) {
			var ss = stylesheets[i];
			var rules = null;
			try {
				//in Firefox, the script can only access stylesheets on the same (sub)domain
				//(a script on http://www.somedomain.com/somescript.js (with www) cannot access a stylesheet at http://somedomain.com/somestyle.css (without www))
				//so I'll wrap this in a try/catch block
				rules = ss.cssRules ? ss.cssRules: ss.rules
			} catch(e) {
			}
			if (!rules) continue;
			for (j=0; j<rules.length; j++){
				var st = rules[j].selectorText;
				if (st.indexOf(".vbs-") > -1) {
					//then check which rule this is exactly (we don't want to do this for every rule)
					//don't use if ... else because selectors may be grouped
					if (st.indexOf(".vbs-posVal-1") > -1) {
						vbs.setScaleStyleVars(rules[j], "posValMin");
					}
					if (st.indexOf(".vbs-posVal-Max") > -1) {
						vbs.setScaleStyleVars(rules[j], "posValMax");
					}
					if (st.indexOf(".vbs-negVal-1") > -1) {
						vbs.setScaleStyleVars(rules[j], "negValMin");
					}
					if (st.indexOf(".vbs-negVal-Max") > -1) {
						vbs.setScaleStyleVars(rules[j], "negValMax");
					}
				}
			}
		}
	},
	
	setScaleStyleVars: function(rule, prefix) {
		//gets all styles for a specific scale and sets corresponding variables
		
		//get bgColor
		var bgc = rule.style.backgroundColor;//also works when backgroundColor is set with just "background"
		vbs[prefix+"BgColor"] = vbs.getRgb(bgc);
		
		//get color
		var c = rule.style.color;
		vbs[prefix+"Color"] = vbs.getRgb(c);
		
		//get fontsize
		var f = rule.style.fontSize;
		var fontSize = parseFloat(f);//fontsize as float
		var fontUnit = f.substring(fontSize.toString().length);//px, em, %
		vbs[prefix+"FontSize"] = fontSize;
		vbs[prefix+"FontUnit"] = fontUnit;
	},
	
	createScaleStyles: function(prefix) {
		//creates all intermediate styles for pos or neg values and returns css rules
		//check if at least one of the styles color, background-color and font-size has been set for both min and max values
		var css = "";
		
		if (vbs.applyColor(prefix) || vbs.applyBgColor(prefix) || vbs.applyFontSize(prefix)) {
			for (var i=2; i<vbs.scales; i++) {
				var selector = vbs.cssSelectorPrefix+".vbs-"+prefix+"Val-"+i;
				console.log(selector);
				css += selector + "{";
				
				//color
				if (vbs.applyColor(prefix)) {
					var red = vbs.getScaleValue(vbs[prefix+"ValMinColor"][0], vbs[prefix+"ValMaxColor"][0], i);
					var green = vbs.getScaleValue(vbs[prefix+"ValMinColor"][1], vbs[prefix+"ValMaxColor"][1], i);
					var blue = vbs.getScaleValue(vbs[prefix+"ValMinColor"][2], vbs[prefix+"ValMaxColor"][2], i);
					
					css += "color: rgb("+red+", "+green+", "+blue+");";
				}
				
				//background-color
				if (vbs.applyBgColor(prefix)) {
					var red = vbs.getScaleValue(vbs[prefix+"ValMinBgColor"][0], vbs[prefix+"ValMaxBgColor"][0], i);
					var green = vbs.getScaleValue(vbs[prefix+"ValMinBgColor"][1], vbs[prefix+"ValMaxBgColor"][1], i);
					var blue = vbs.getScaleValue(vbs[prefix+"ValMinBgColor"][2], vbs[prefix+"ValMaxBgColor"][2], i);
					
					css += "background-color: rgb("+red+", "+green+", "+blue+");";
				}
				
				//font-size
				if (vbs.applyFontSize(prefix)) {
					var fontSize = "font-size: "+vbs.getScaleValue(vbs[prefix+"ValMinFontSize"], vbs[prefix+"ValMaxFontSize"], i)+vbs[prefix+"ValMinFontUnit"];
					
					css += fontSize;
				}
				
				css += "}";
			}
		}
		return(css);
	},
	
	getScaleValue: function(min, max, scale) {
		min = parseFloat(min);
		max = parseFloat(max);
		return (Math.floor(min + scale*(max-min)/vbs.scales));
	},
	
	applyColor: function(prefix) {
		//checks if color is defined for both min and max classes
		//param prefix: "pos" or "neg"
		return(vbs[prefix+"ValMinColor"] !== null && vbs[prefix+"ValMaxColor"] !== null);
	},
	
	applyBgColor: function(prefix) {
		//checks if background-color is defined for both min and max classes
		//param prefix: "pos" or "neg"
		return(vbs[prefix+"ValMinBgColor"] !== null && vbs[prefix+"ValMaxBgColor"] !== null);
	},
	
	applyFontSize: function(prefix) {
		//checks if font-size is defined for both min and max classes, and both use the same units
		//param prefix: "pos" or "neg"
		return(vbs[prefix+"ValMinFontSize"] !== null && vbs[prefix+"ValMaxFontSize"] !== null && vbs[prefix+"ValMinFontUnit"] == vbs[prefix+"ValMaxFontUnit"]);
	},
	
	setMinMax: function(tbl) {
		//determines the min and max values of table tbl
		//first reset all max and min values (necessary when there are more than one table on a page)
		vbs.posValMin = null;
		vbs.posValMax = null;
		vbs.negValMin = null;
		vbs.negValMax = null;
		
		var tds = tbl.getElementsByTagName("td");
		for (var i=0; i<tds.length; i++) {
			var val = parseFloat(vbs.getValue(tds[i]));
			if (!isNaN(val)) {
				if (val >= 0) {
					vbs.posValMin = (vbs.posValMin === null) ? val : Math.min(val, vbs.posValMin);
					vbs.posValMax = (vbs.posValMax === null) ? val : Math.max(val, vbs.posValMax);
				} else if (val <= 0) {
					vbs.negValMin = (vbs.negValMin === null) ? val : Math.max(val, vbs.negValMin);//smallest negative value, i.e. closest to 0
					vbs.negValMax = (vbs.negValMax === null) ? val : Math.min(val, vbs.negValMax);//biggest negative value, i.e. farthest from 0
				}
			}
		}
		if (vbs.posValMax !== null && vbs.negValMax !== null) {
			//then set values to the highest absolute value
			vbs.posValMin = vbs.negValMin = 0;
			vbs.posValMax = Math.max(vbs.posValMax, Math.abs(vbs.negValMax));
			vbs.negValMax = -vbs.posValMax;
		}
	},
	
	addTdClasses: function(tbl) {
		//adds classes to every td of table tbl
		var tds = tbl.getElementsByTagName("td");
		for (var i=0; i<tds.length; i++) {
			var td = tds[i];
			var val = parseFloat(vbs.getValue(td));
			var className;
			if (isNaN(val)) {
				className = "vbs-NaN";
			} else if (val == 0) {
				className = "vbs-zero";
			} else {
				//calculate in which scale this value fits
				className = vbs.getValClass(val);
			}
			vbs.addClassName(td,className);
		}
	},
	
	getValClass: function(val) {
		//determines in which value-scale val belongs and returns the appropriate className
		var className;
		var abs = Math.abs(val);
		var bandwidth = vbs.posValMax - vbs.posValMin;
		var scale = Math.ceil(vbs.scales*(abs - vbs.posValMin)/bandwidth);
		if (scale == 0) {
			className = "vbs-zero";
		} else {
			var prefix = (val > 0) ? "vbs-posVal-" : "vbs-negVal-";
			if (scale == vbs.scales) scale = "Max";
			className = prefix+scale;
		}
		return(className);
	},
	
	//-- Start helper functions
		getValue: function(el) {
			while (el.nodeType != 3 && el.firstChild != null) {//3 is text node
				el = el.firstChild;
			}
			return(el.nodeValue);
		},
		
		addClassName: function(el, className) {
			//adds className to el
			if (el.className == "") {
				el.className = className;
			} else {
				el.className += " "+className;
			}
		},
		
		hexToRgb: function(hex) {
			//returns array[r,g,b] for hex value
			//param hex: color value in format #ffcc00
			if (hex.indexOf("#") != 0 || hex.length != 7) return null;
			var r = parseInt ( hex.substring (1,3),16);
			var g = parseInt ( hex.substring (3,5),16);
			var b = parseInt ( hex.substring (5,7),16);
			return (new Array(r,g,b));
		},
	
		getRgb: function(c) {
			//transforms color-property c to Array [r,g,b]
			//browsers return background-color in different ways, for example when set in css as #fc0:
			//firefox, safari, chrome: rgb(255, 204, 0)
			//ie: #fc0
			//opera: #ffcc00
			//any other format (none, transparent) returns null
			if (c.indexOf("#") == 0) {
				if(c.length == 4) {
					//format is #fc0; convert to #ffcc00
					rhex = c.substr(1,1);
					ghex = c.substr(2,1);
					bhex = c.substr(3,1);
					c = "#"+rhex+rhex+ghex+ghex+bhex+bhex;
				};
				return(vbs.hexToRgb(c));
			} else if (c.indexOf("rgb(") == 0) {
				c = c.split("rgb(")[1].split(")")[0].split(",");
				return(c);
			} else {
				return null;
			}
		},
		
		addCss: function(cssCode) {
			//adds css to head
			//thanks to http://yuiblog.com/blog/2007/06/07/style/
			var styleElement = document.createElement("style");
			styleElement.type = "text/css";
			if (styleElement.styleSheet) {
				styleElement.styleSheet.cssText = cssCode;
			} else {
				styleElement.appendChild(document.createTextNode(cssCode));
			}
			document.getElementsByTagName("head")[0].appendChild(styleElement);
		},
		
		getElementsByClassName: function (className, tag, elm) {
			/*
				Developed by Robert Nyman, http://www.robertnyman.com
				Code/licensing: http://code.google.com/p/getelementsbyclassname/
			*/
			if (document.getElementsByClassName) {
				getElementsByClassName = function (className, tag, elm) {
					elm = elm || document;
					var elements = elm.getElementsByClassName(className),
						nodeName = (tag)? new RegExp("\\b" + tag + "\\b", "i") : null,
						returnElements = [],
						current;
					for(var i=0, il=elements.length; i<il; i+=1){
						current = elements[i];
						if(!nodeName || nodeName.test(current.nodeName)) {
							returnElements.push(current);
						}
					}
					return returnElements;
				};
			} else if (document.evaluate) {
				getElementsByClassName = function (className, tag, elm) {
					tag = tag || "*";
					elm = elm || document;
					var classes = className.split(" "),
						classesToCheck = "",
						xhtmlNamespace = "http://www.w3.org/1999/xhtml",
						namespaceResolver = (document.documentElement.namespaceURI === xhtmlNamespace)? xhtmlNamespace : null,
						returnElements = [],
						elements,
						node;
					for(var j=0, jl=classes.length; j<jl; j+=1){
						classesToCheck += "[contains(concat(' ', @class, ' '), ' " + classes[j] + " ')]";
					}
					try	{
						elements = document.evaluate(".//" + tag + classesToCheck, elm, namespaceResolver, 0, null);
					}
					catch (e) {
						elements = document.evaluate(".//" + tag + classesToCheck, elm, null, 0, null);
					}
					while ((node = elements.iterateNext())) {
						returnElements.push(node);
					}
					return returnElements;
				};
			} else {
				getElementsByClassName = function (className, tag, elm) {
					tag = tag || "*";
					elm = elm || document;
					var classes = className.split(" "),
						classesToCheck = [],
						elements = (tag === "*" && elm.all)? elm.all : elm.getElementsByTagName(tag),
						current,
						returnElements = [],
						match;
					for(var k=0, kl=classes.length; k<kl; k+=1){
						classesToCheck.push(new RegExp("(^|\\s)" + classes[k] + "(\\s|$)"));
					}
					for(var l=0, ll=elements.length; l<ll; l+=1){
						current = elements[l];
						match = false;
						for(var m=0, ml=classesToCheck.length; m<ml; m+=1){
							match = classesToCheck[m].test(current.className);
							if (!match) {
								break;
							}
						}
						if (match) {
							returnElements.push(current);
						}
					}
					return returnElements;
				};
			}
			return getElementsByClassName(className, tag, elm);
		}
	//-- End helper functions
}

/*
to initialize, call vbs.init();
you can do this here at the end of the script (this will only work if you include the js-file at the end of the body), or better when the dom is ready.
for calling the function when the dom is ready I recommend the script detailed at http://www.thefutureoftheweb.com/blog/adddomloadevent
*/
vbs.init();
