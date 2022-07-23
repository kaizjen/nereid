/* NavigationView.svelte generated by Svelte v3.48.0 */
import {
	SvelteComponentDev,
	add_location,
	append_dev,
	append_styles,
	attr_dev,
	create_slot,
	detach_dev,
	dispatch_dev,
	element,
	get_all_dirty_from_scope,
	get_slot_changes,
	init,
	insert_dev,
	listen_dev,
	noop,
	safe_not_equal,
	space,
	toggle_class,
	transition_in,
	transition_out,
	update_slot_base,
	validate_slots
} from "nereid://.svelte/internal/index.mjs";

import { createEventDispatcher } from "nereid://.svelte/index.mjs";
const file = "NavigationView.svelte";

function add_css(target) {
	append_styles(target, "svelte-z527vv", ".navigation-view.svelte-z527vv.svelte-z527vv{block-size:100%;display:flex;font-family:var(--fds-font-family-text);font-size:var(--fds-body-font-size);font-weight:400;inline-size:100%;line-height:20px;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.navigation-view.variant--default.svelte-z527vv .navigation-view-pane.svelte-z527vv{inline-size:48px}.navigation-view.variant--default.svelte-z527vv .navigation-view-pane.expanded.svelte-z527vv{inline-size:320px}.navigation-view-pane.svelte-z527vv.svelte-z527vv{block-size:100%;display:flex;flex:0 0 auto;flex-direction:column;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.navigation-view-pane-header.svelte-z527vv.svelte-z527vv{-webkit-padding-before:4px;display:block;flex:0 0 auto;padding-block-start:4px}.navigation-view-page.svelte-z527vv.svelte-z527vv{-webkit-border-after:none;-webkit-border-end:none;background-clip:padding-box;background-color:var(--fds-layer-background-default);border:1px solid var(--fds-card-stroke-default);border-block-end:none;border-inline-end:none;border-start-start-radius:var(--fds-overlay-corner-radius);display:flex;flex:1 1 auto;flex-direction:column;padding-block:44px;padding-inline:56px}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTmF2aWdhdGlvblZpZXcuc3ZlbHRlIiwic291cmNlcyI6WyJOYXZpZ2F0aW9uVmlldy5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHNjcmlwdCA+aW1wb3J0IHsgY3JlYXRlRXZlbnREaXNwYXRjaGVyIH0gZnJvbSBcInN2ZWx0ZVwiO1xyXG5leHBvcnQgbGV0IHZhcmlhbnQgPSBcImRlZmF1bHRcIjtcclxuZXhwb3J0IGxldCBleHBhbmRlZCA9IHRydWU7XHJcbmV4cG9ydCBsZXQgbWVudUJ1dHRvbiA9IHRydWU7XHJcbmV4cG9ydCBsZXQgYmFja0J1dHRvbiA9IHRydWU7XHJcbmNvbnN0IGRpc3BhdGNoID0gY3JlYXRlRXZlbnREaXNwYXRjaGVyKCk7XHJcbjwvc2NyaXB0PlxuXG48bWFpbiBjbGFzcz1cIm5hdmlnYXRpb24tdmlldyB2YXJpYW50LXt2YXJpYW50fVwiPlxuXHQ8YXNpZGUgY2xhc3M9XCJuYXZpZ2F0aW9uLXZpZXctcGFuZVwiIGNsYXNzOmV4cGFuZGVkPlxuXHRcdDxoZWFkZXIgY2xhc3M9XCJuYXZpZ2F0aW9uLXZpZXctcGFuZS1oZWFkZXJcIj5cblx0XHRcdHsjaWYgYmFja0J1dHRvbn1cblx0XHRcdFx0PGJ1dHRvbiBvbjpjbGljaz17KCkgPT4gZGlzcGF0Y2goXCJiYWNrXCIpfT5cblx0XHRcdFx0XHR7XCI8LVwifVxuXHRcdFx0XHQ8L2J1dHRvbj5cblx0XHRcdHsvaWZ9XG5cdFx0XHR7I2lmIG1lbnVCdXR0b259XG5cdFx0XHRcdDxidXR0b24gb246Y2xpY2s9eygpID0+IChleHBhbmRlZCA9ICFleHBhbmRlZCl9PlxuXHRcdFx0XHRcdHtcIi1cIn1cblx0XHRcdFx0PC9idXR0b24+XG5cdFx0XHR7L2lmfVxuXG5cdFx0XHQ8c2xvdCBuYW1lPVwiaGVhZGVyXCIgLz5cblx0XHQ8L2hlYWRlcj5cblx0XHQ8c2xvdCBuYW1lPVwiaXRlbXNcIiAvPlxuXHRcdDxmb290ZXIgY2xhc3M9XCJuYXZpZ2F0aW9uLXZpZXctcGFuZS1mb290ZXJcIj5cblx0XHRcdDxzbG90IG5hbWU9XCJmb290ZXJcIiAvPlxuXHRcdDwvZm9vdGVyPlxuXHQ8L2FzaWRlPlxuXHQ8YXJ0aWNsZSBjbGFzcz1cIm5hdmlnYXRpb24tdmlldy1wYWdlXCI+XG5cdFx0PHNsb3QgLz5cblx0PC9hcnRpY2xlPlxuPC9tYWluPlxuXG48c3R5bGUgPi5uYXZpZ2F0aW9uLXZpZXd7YmxvY2stc2l6ZToxMDAlO2Rpc3BsYXk6ZmxleDtmb250LWZhbWlseTp2YXIoLS1mZHMtZm9udC1mYW1pbHktdGV4dCk7Zm9udC1zaXplOnZhcigtLWZkcy1ib2R5LWZvbnQtc2l6ZSk7Zm9udC13ZWlnaHQ6NDAwO2lubGluZS1zaXplOjEwMCU7bGluZS1oZWlnaHQ6MjBweDstd2Via2l0LXVzZXItc2VsZWN0Om5vbmU7LW1vei11c2VyLXNlbGVjdDpub25lOy1tcy11c2VyLXNlbGVjdDpub25lO3VzZXItc2VsZWN0Om5vbmV9Lm5hdmlnYXRpb24tdmlldy52YXJpYW50LS1kZWZhdWx0IC5uYXZpZ2F0aW9uLXZpZXctcGFuZXtpbmxpbmUtc2l6ZTo0OHB4fS5uYXZpZ2F0aW9uLXZpZXcudmFyaWFudC0tZGVmYXVsdCAubmF2aWdhdGlvbi12aWV3LXBhbmUuZXhwYW5kZWR7aW5saW5lLXNpemU6MzIwcHh9Lm5hdmlnYXRpb24tdmlldy1wYW5le2Jsb2NrLXNpemU6MTAwJTtkaXNwbGF5OmZsZXg7ZmxleDowIDAgYXV0bztmbGV4LWRpcmVjdGlvbjpjb2x1bW47LXdlYmtpdC11c2VyLXNlbGVjdDpub25lOy1tb3otdXNlci1zZWxlY3Q6bm9uZTstbXMtdXNlci1zZWxlY3Q6bm9uZTt1c2VyLXNlbGVjdDpub25lfS5uYXZpZ2F0aW9uLXZpZXctcGFuZS1oZWFkZXJ7LXdlYmtpdC1wYWRkaW5nLWJlZm9yZTo0cHg7ZGlzcGxheTpibG9jaztmbGV4OjAgMCBhdXRvO3BhZGRpbmctYmxvY2stc3RhcnQ6NHB4fS5uYXZpZ2F0aW9uLXZpZXctcGFnZXstd2Via2l0LWJvcmRlci1hZnRlcjpub25lOy13ZWJraXQtYm9yZGVyLWVuZDpub25lO2JhY2tncm91bmQtY2xpcDpwYWRkaW5nLWJveDtiYWNrZ3JvdW5kLWNvbG9yOnZhcigtLWZkcy1sYXllci1iYWNrZ3JvdW5kLWRlZmF1bHQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tZmRzLWNhcmQtc3Ryb2tlLWRlZmF1bHQpO2JvcmRlci1ibG9jay1lbmQ6bm9uZTtib3JkZXItaW5saW5lLWVuZDpub25lO2JvcmRlci1zdGFydC1zdGFydC1yYWRpdXM6dmFyKC0tZmRzLW92ZXJsYXktY29ybmVyLXJhZGl1cyk7ZGlzcGxheTpmbGV4O2ZsZXg6MSAxIGF1dG87ZmxleC1kaXJlY3Rpb246Y29sdW1uO3BhZGRpbmctYmxvY2s6NDRweDtwYWRkaW5nLWlubGluZTo1NnB4fTwvc3R5bGU+XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBa0NRLDRDQUFnQixDQUFDLFdBQVcsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLFlBQVksSUFBSSxzQkFBc0IsQ0FBQyxDQUFDLFVBQVUsSUFBSSxvQkFBb0IsQ0FBQyxDQUFDLFlBQVksR0FBRyxDQUFDLFlBQVksSUFBSSxDQUFDLFlBQVksSUFBSSxDQUFDLG9CQUFvQixJQUFJLENBQUMsaUJBQWlCLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLFlBQVksSUFBSSxDQUFDLGdCQUFnQiwrQkFBaUIsQ0FBQyxtQ0FBcUIsQ0FBQyxZQUFZLElBQUksQ0FBQyxnQkFBZ0IsK0JBQWlCLENBQUMscUJBQXFCLHVCQUFTLENBQUMsWUFBWSxLQUFLLENBQUMsaURBQXFCLENBQUMsV0FBVyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLE1BQU0sQ0FBQyxvQkFBb0IsSUFBSSxDQUFDLGlCQUFpQixJQUFJLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxZQUFZLElBQUksQ0FBQyx3REFBNEIsQ0FBQyx1QkFBdUIsR0FBRyxDQUFDLFFBQVEsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsQ0FBQyxpREFBcUIsQ0FBQyxxQkFBcUIsSUFBSSxDQUFDLG1CQUFtQixJQUFJLENBQUMsZ0JBQWdCLFdBQVcsQ0FBQyxpQkFBaUIsSUFBSSw4QkFBOEIsQ0FBQyxDQUFDLE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLHlCQUF5QixDQUFDLENBQUMsaUJBQWlCLElBQUksQ0FBQyxrQkFBa0IsSUFBSSxDQUFDLDBCQUEwQixJQUFJLDJCQUEyQixDQUFDLENBQUMsUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLE1BQU0sQ0FBQyxjQUFjLElBQUksQ0FBQyxlQUFlLElBQUksQ0FBQyJ9 */");
}

const get_footer_slot_changes = dirty => ({});
const get_footer_slot_context = ctx => ({});
const get_items_slot_changes = dirty => ({});
const get_items_slot_context = ctx => ({});
const get_header_slot_changes = dirty => ({});
const get_header_slot_context = ctx => ({});

// (12:3) {#if backButton}
function create_if_block_1(ctx) {
	let button;
	let mounted;
	let dispose;

	const block = {
		c: function create() {
			button = element("button");
			button.textContent = `${"<-"}`;
			add_location(button, file, 12, 4, 409);
		},
		m: function mount(target, anchor) {
			insert_dev(target, button, anchor);

			if (!mounted) {
				dispose = listen_dev(button, "click", /*click_handler*/ ctx[7], false, false, false);
				mounted = true;
			}
		},
		p: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(button);
			mounted = false;
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_1.name,
		type: "if",
		source: "(12:3) {#if backButton}",
		ctx
	});

	return block;
}

// (17:3) {#if menuButton}
function create_if_block(ctx) {
	let button;
	let mounted;
	let dispose;

	const block = {
		c: function create() {
			button = element("button");
			button.textContent = `${"-"}`;
			add_location(button, file, 17, 4, 511);
		},
		m: function mount(target, anchor) {
			insert_dev(target, button, anchor);

			if (!mounted) {
				dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[8], false, false, false);
				mounted = true;
			}
		},
		p: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(button);
			mounted = false;
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block.name,
		type: "if",
		source: "(17:3) {#if menuButton}",
		ctx
	});

	return block;
}

function create_fragment(ctx) {
	let main;
	let aside;
	let header;
	let t0;
	let t1;
	let t2;
	let t3;
	let footer;
	let t4;
	let article;
	let main_class_value;
	let current;
	let if_block0 = /*backButton*/ ctx[3] && create_if_block_1(ctx);
	let if_block1 = /*menuButton*/ ctx[2] && create_if_block(ctx);
	const header_slot_template = /*#slots*/ ctx[6].header;
	const header_slot = create_slot(header_slot_template, ctx, /*$$scope*/ ctx[5], get_header_slot_context);
	const items_slot_template = /*#slots*/ ctx[6].items;
	const items_slot = create_slot(items_slot_template, ctx, /*$$scope*/ ctx[5], get_items_slot_context);
	const footer_slot_template = /*#slots*/ ctx[6].footer;
	const footer_slot = create_slot(footer_slot_template, ctx, /*$$scope*/ ctx[5], get_footer_slot_context);
	const default_slot_template = /*#slots*/ ctx[6].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

	const block = {
		c: function create() {
			main = element("main");
			aside = element("aside");
			header = element("header");
			if (if_block0) if_block0.c();
			t0 = space();
			if (if_block1) if_block1.c();
			t1 = space();
			if (header_slot) header_slot.c();
			t2 = space();
			if (items_slot) items_slot.c();
			t3 = space();
			footer = element("footer");
			if (footer_slot) footer_slot.c();
			t4 = space();
			article = element("article");
			if (default_slot) default_slot.c();
			attr_dev(header, "class", "navigation-view-pane-header svelte-z527vv");
			add_location(header, file, 10, 2, 340);
			attr_dev(footer, "class", "navigation-view-pane-footer");
			add_location(footer, file, 25, 2, 659);
			attr_dev(aside, "class", "navigation-view-pane svelte-z527vv");
			toggle_class(aside, "expanded", /*expanded*/ ctx[0]);
			add_location(aside, file, 9, 1, 286);
			attr_dev(article, "class", "navigation-view-page svelte-z527vv");
			add_location(article, file, 29, 1, 753);
			attr_dev(main, "class", main_class_value = "navigation-view variant-" + /*variant*/ ctx[1] + " svelte-z527vv");
			add_location(main, file, 8, 0, 236);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, main, anchor);
			append_dev(main, aside);
			append_dev(aside, header);
			if (if_block0) if_block0.m(header, null);
			append_dev(header, t0);
			if (if_block1) if_block1.m(header, null);
			append_dev(header, t1);

			if (header_slot) {
				header_slot.m(header, null);
			}

			append_dev(aside, t2);

			if (items_slot) {
				items_slot.m(aside, null);
			}

			append_dev(aside, t3);
			append_dev(aside, footer);

			if (footer_slot) {
				footer_slot.m(footer, null);
			}

			append_dev(main, t4);
			append_dev(main, article);

			if (default_slot) {
				default_slot.m(article, null);
			}

			current = true;
		},
		p: function update(ctx, [dirty]) {
			if (/*backButton*/ ctx[3]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_1(ctx);
					if_block0.c();
					if_block0.m(header, t0);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*menuButton*/ ctx[2]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block(ctx);
					if_block1.c();
					if_block1.m(header, t1);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (header_slot) {
				if (header_slot.p && (!current || dirty & /*$$scope*/ 32)) {
					update_slot_base(
						header_slot,
						header_slot_template,
						ctx,
						/*$$scope*/ ctx[5],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
						: get_slot_changes(header_slot_template, /*$$scope*/ ctx[5], dirty, get_header_slot_changes),
						get_header_slot_context
					);
				}
			}

			if (items_slot) {
				if (items_slot.p && (!current || dirty & /*$$scope*/ 32)) {
					update_slot_base(
						items_slot,
						items_slot_template,
						ctx,
						/*$$scope*/ ctx[5],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
						: get_slot_changes(items_slot_template, /*$$scope*/ ctx[5], dirty, get_items_slot_changes),
						get_items_slot_context
					);
				}
			}

			if (footer_slot) {
				if (footer_slot.p && (!current || dirty & /*$$scope*/ 32)) {
					update_slot_base(
						footer_slot,
						footer_slot_template,
						ctx,
						/*$$scope*/ ctx[5],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
						: get_slot_changes(footer_slot_template, /*$$scope*/ ctx[5], dirty, get_footer_slot_changes),
						get_footer_slot_context
					);
				}
			}

			if (dirty & /*expanded*/ 1) {
				toggle_class(aside, "expanded", /*expanded*/ ctx[0]);
			}

			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[5],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null),
						null
					);
				}
			}

			if (!current || dirty & /*variant*/ 2 && main_class_value !== (main_class_value = "navigation-view variant-" + /*variant*/ ctx[1] + " svelte-z527vv")) {
				attr_dev(main, "class", main_class_value);
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(header_slot, local);
			transition_in(items_slot, local);
			transition_in(footer_slot, local);
			transition_in(default_slot, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(header_slot, local);
			transition_out(items_slot, local);
			transition_out(footer_slot, local);
			transition_out(default_slot, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(main);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
			if (header_slot) header_slot.d(detaching);
			if (items_slot) items_slot.d(detaching);
			if (footer_slot) footer_slot.d(detaching);
			if (default_slot) default_slot.d(detaching);
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
	validate_slots('NavigationView', slots, ['header','items','footer','default']);
	let { variant = "default" } = $$props;
	let { expanded = true } = $$props;
	let { menuButton = true } = $$props;
	let { backButton = true } = $$props;
	const dispatch = createEventDispatcher();
	const writable_props = ['variant', 'expanded', 'menuButton', 'backButton'];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<NavigationView> was created with unknown prop '${key}'`);
	});

	const click_handler = () => dispatch("back");
	const click_handler_1 = () => $$invalidate(0, expanded = !expanded);

	$$self.$$set = $$props => {
		if ('variant' in $$props) $$invalidate(1, variant = $$props.variant);
		if ('expanded' in $$props) $$invalidate(0, expanded = $$props.expanded);
		if ('menuButton' in $$props) $$invalidate(2, menuButton = $$props.menuButton);
		if ('backButton' in $$props) $$invalidate(3, backButton = $$props.backButton);
		if ('$$scope' in $$props) $$invalidate(5, $$scope = $$props.$$scope);
	};

	$$self.$capture_state = () => ({
		createEventDispatcher,
		variant,
		expanded,
		menuButton,
		backButton,
		dispatch
	});

	$$self.$inject_state = $$props => {
		if ('variant' in $$props) $$invalidate(1, variant = $$props.variant);
		if ('expanded' in $$props) $$invalidate(0, expanded = $$props.expanded);
		if ('menuButton' in $$props) $$invalidate(2, menuButton = $$props.menuButton);
		if ('backButton' in $$props) $$invalidate(3, backButton = $$props.backButton);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [
		expanded,
		variant,
		menuButton,
		backButton,
		dispatch,
		$$scope,
		slots,
		click_handler,
		click_handler_1
	];
}

class NavigationView extends SvelteComponentDev {
	constructor(options) {
		super(options);

		init(
			this,
			options,
			instance,
			create_fragment,
			safe_not_equal,
			{
				variant: 1,
				expanded: 0,
				menuButton: 2,
				backButton: 3
			},
			add_css
		);

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "NavigationView",
			options,
			id: create_fragment.name
		});
	}

	get variant() {
		throw new Error("<NavigationView>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set variant(value) {
		throw new Error("<NavigationView>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get expanded() {
		throw new Error("<NavigationView>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set expanded(value) {
		throw new Error("<NavigationView>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get menuButton() {
		throw new Error("<NavigationView>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set menuButton(value) {
		throw new Error("<NavigationView>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get backButton() {
		throw new Error("<NavigationView>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set backButton(value) {
		throw new Error("<NavigationView>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

export default NavigationView;