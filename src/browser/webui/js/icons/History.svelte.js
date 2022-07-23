/* History.svelte generated by Svelte v3.48.0 */
import {
	SvelteComponentDev,
	add_location,
	append_dev,
	attr_dev,
	detach_dev,
	dispatch_dev,
	init,
	insert_dev,
	noop,
	safe_not_equal,
	svg_element,
	validate_slots
} from "nereid://.svelte/internal/index.mjs";

const file = "History.svelte";

function create_fragment(ctx) {
	let svg;
	let path0;
	let path1;

	const block = {
		c: function create() {
			svg = svg_element("svg");
			path0 = svg_element("path");
			path1 = svg_element("path");
			attr_dev(path0, "d", "M0 0h24v24H0V0z");
			attr_dev(path0, "fill", "none");
			add_location(path0, file, 5, 2, 213);
			attr_dev(path1, "d", "M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.25 2.52.77-1.28-3.52-2.09V8z");
			add_location(path1, file, 6, 2, 256);
			attr_dev(svg, "title", /*title*/ ctx[0]);
			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
			attr_dev(svg, "height", "24px");
			attr_dev(svg, "viewBox", "0 0 24 24");
			attr_dev(svg, "width", "24px");
			attr_dev(svg, "fill", "var(--fds-text-primary)");
			add_location(svg, file, 4, 0, 83);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, svg, anchor);
			append_dev(svg, path0);
			append_dev(svg, path1);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*title*/ 1) {
				attr_dev(svg, "title", /*title*/ ctx[0]);
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(svg);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('History', slots, []);
	let { title = "" } = $$props;
	const writable_props = ['title'];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<History> was created with unknown prop '${key}'`);
	});

	$$self.$$set = $$props => {
		if ('title' in $$props) $$invalidate(0, title = $$props.title);
	};

	$$self.$capture_state = () => ({ title });

	$$self.$inject_state = $$props => {
		if ('title' in $$props) $$invalidate(0, title = $$props.title);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [title];
}

class History extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment, safe_not_equal, { title: 0 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "History",
			options,
			id: create_fragment.name
		});
	}

	get title() {
		throw new Error("<History>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set title(value) {
		throw new Error("<History>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

export default History;