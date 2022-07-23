/* EULA.svelte generated by Svelte v3.48.0 */
import {
	SvelteComponentDev,
	add_location,
	add_render_callback,
	append_dev,
	append_styles,
	attr_dev,
	create_component,
	create_in_transition,
	destroy_component,
	detach_dev,
	dispatch_dev,
	element,
	init,
	insert_dev,
	is_function,
	mount_component,
	noop,
	safe_not_equal,
	set_data_dev,
	space,
	text,
	transition_in,
	transition_out,
	validate_slots
} from "nereid://.svelte/internal/index.mjs";

import { Button, TextBlock } from "../modules/fluent-svelte/index.js";
import { fly } from "nereid://.svelte/transition/index.mjs";
const file = "EULA.svelte";

function add_css(target) {
	append_styles(target, "svelte-6r2j0c", ".main.svelte-6r2j0c{width:-webkit-fill-available;height:-webkit-fill-available;z-index:-1;padding-inline:200px}.head.svelte-6r2j0c{-webkit-app-region:drag;padding-top:20px;margin-bottom:50px;padding-left:200px}.textframe.svelte-6r2j0c{padding:8px;max-height:50vh;overflow:auto;white-space:pre-wrap;background:#8080807a;font-family:monospace}.flex.svelte-6r2j0c{display:flex;justify-content:space-between;margin-top:10px}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRVVMQS5zdmVsdGUiLCJzb3VyY2VzIjpbIkVVTEEuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzdHlsZT5cclxuICAubWFpbiB7XHJcbiAgICB3aWR0aDogLXdlYmtpdC1maWxsLWF2YWlsYWJsZTtcclxuICAgIGhlaWdodDogLXdlYmtpdC1maWxsLWF2YWlsYWJsZTtcclxuICAgIHotaW5kZXg6IC0xO1xyXG4gICAgcGFkZGluZy1pbmxpbmU6IDIwMHB4O1xyXG4gIH1cclxuICAuaGVhZCB7XHJcbiAgICAtd2Via2l0LWFwcC1yZWdpb246IGRyYWc7XHJcbiAgICBwYWRkaW5nLXRvcDogMjBweDtcclxuICAgIG1hcmdpbi1ib3R0b206IDUwcHg7XHJcbiAgICBwYWRkaW5nLWxlZnQ6IDIwMHB4O1xyXG4gIH1cclxuICAudGV4dGZyYW1lIHtcclxuICAgIHBhZGRpbmc6IDhweDtcclxuICAgIG1heC1oZWlnaHQ6IDUwdmg7XHJcbiAgICBvdmVyZmxvdzogYXV0bztcclxuICAgIHdoaXRlLXNwYWNlOiBwcmUtd3JhcDtcclxuICAgIGJhY2tncm91bmQ6ICM4MDgwODA3YTtcclxuICAgIGZvbnQtZmFtaWx5OiBtb25vc3BhY2U7XHJcbiAgfVxyXG4gIC5mbGV4IHtcclxuICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XHJcbiAgICBtYXJnaW4tdG9wOiAxMHB4O1xyXG4gIH1cclxuPC9zdHlsZT5cclxuPHNjcmlwdD5cclxuICBpbXBvcnQgeyBCdXR0b24sIFRleHRCbG9jayB9IGZyb20gXCJmbHVlbnQtc3ZlbHRlXCI7XHJcbiAgaW1wb3J0IHsgZmx5IH0gZnJvbSBcInN2ZWx0ZS90cmFuc2l0aW9uXCI7XHJcblxyXG4gIGV4cG9ydCBsZXQgbmV4dDtcclxuXHJcbiAgY29uc3QgeyB0IH0gPSB3aW5kb3cubmVyZWlkLmkxOG47XHJcbiAgbGV0IFRPUztcclxuXHJcbiAgY29uc3QgRW5nbGlzaFRPUyA9IGBcclxuSGVsbG8uIE5lcmVpZCBpcyBmcmVlIHRvIHVzZSBhbmQgbW9kaWZ5LlxyXG5UaGlzIGFncmVlbWVudCAodGhhdCB5b3UncmUgcmVhZGluZyByaWdodCBub3cpIHBlcm1pdHMgeW91IHRvIHVzZSBOZXJlaWQgYW5kIG1vZGlmeSBpdHMgY29kZSBmcmVlbHkuXHJcblRoZSBhdXRob3Igb2YgdGhpcyBzb2Z0d2FyZSBpcyByZWxlYXNlZCBmcm9tIGFueSBsaWFiaWxpdHkgb3IgcmVzcG9uc2liaWxpdHkgZnJvbSBhbnkgZGFtYWdlIGRvbmUgYnkgdGhpcyBzb2Z0d2FyZS5cclxuXHJcbltJTVBPUlRBTlRdXHJcbkFzIHBlciB0aGUgY2xvc2VkIGFscGhhIHZlcnNpb24gb2YgdGhpcyBzb2Z0d2FyZSwgTmVyZWlkIHdpbGwgc2VuZCBkYXRhIHRvIGl0cyBvbmxpbmUgc2VydmljZXMgd2l0aG91dCB3YXJuaW5nLlxyXG5TYWlkIGRhdGEgaW5jbHVkZXM6IHlvdXIgT1MgdmVyc2lvbiBhbmQgdGFnLCB5b3VyIGhhcmR3YXJlIGlkZW50aWZkaWVycywgY3Jhc2ggcmVwb3J0cywgb3RoZXIgZXJyb3IgYW5kIGxvZyBpbmZvcm1hdGlvbi5cclxuVGhlc2UgcmVwb3J0cyBzaG91bGQgZXhjbHVkZSBhbnkgc2Vuc2l0aXZlIGRhdGEsIGxpa2UgdGhlIHNpdGVzIHlvdSB2aXNpdCBvciB5b3VyIGhpc3RvcnksIGV2ZW4gdGhvdWdoIGluIHNvbWUgZWRnZSBjYXNlcywgb3IgZHVlIHRvIGEgYnVnIHRoaXMgZGF0YSBtYXkgYmUgc3RpbGwgc2VudCBzb21ldGltZXMuXHJcblxyXG5UaGUgc29mdHdhcmUgaXMgbGljZW5zZWQgdW5kZXIgYW4gTUlUIExpY2Vuc2UsIHdoaWNoIHJlYWRzIGFzIGZvbGxvd3M6XHJcblxyXG5Db3B5cmlnaHQgKGMpIDIwMjIgQHdoZWV6YXJkXHJcblxyXG5QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxyXG5cclxuVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXHJcblxyXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cclxuICBgXHJcblxyXG4gIGNvbnN0IExvY2FsaXplZFRPUyA9IHQoJ0xvY2FsaXplZFRPUycpO1xyXG4gIGlmIChMb2NhbGl6ZWRUT1MgPT0gJ0xvY2FsaXplZFRPUycpIHtcclxuICAgIFRPUyA9IEVuZ2xpc2hUT1M7XHJcbiAgICBcclxuICB9IGVsc2UgaWYgKExvY2FsaXplZFRPUy50cmltKCkucmVwbGFjZUFsbCgnXFxuJywgJycpLnJlcGxhY2VBbGwoJyAnLCAnJykgPT0gRW5nbGlzaFRPUy50cmltKCkucmVwbGFjZUFsbCgnXFxuJywgJycpLnJlcGxhY2VBbGwoJyAnLCAnJykpIHtcclxuICAgIFRPUyA9IExvY2FsaXplZFRPUztcclxuXHJcbiAgfSBlbHNlIHtcclxuICAgIFRPUyA9IExvY2FsaXplZFRPUyArICdcXG5cXG5FbmdsaXNoIChvcmlnaW5hbCkgZm9ybTpcXG4nICsgRW5nbGlzaFRPU1xyXG4gIH1cclxuPC9zY3JpcHQ+XHJcblxyXG5cclxuPGRpdiBjbGFzcz1cImhlYWRcIj5cclxuICA8VGV4dEJsb2NrIHZhcmlhbnQ9XCJ0aXRsZUxhcmdlXCI+e3QoJ3BhZ2VzLndlbGNvbWUuVE9TLnRpdGxlJyl9PC9UZXh0QmxvY2s+XHJcbjwvZGl2PlxyXG48ZGl2IGNsYXNzPVwibWFpblwiIGluOmZseT17eyB4OiA0MDAgfX0+XHJcbiAgPGRpdiBjbGFzcz1cIm5vdGVcIj5cclxuICAgIHt0KCdwYWdlcy53ZWxjb21lLlRPUy5ub3RlJyl9XHJcbiAgPC9kaXY+XHJcblxyXG4gIDxkaXYgY2xhc3M9XCJ0ZXh0ZnJhbWVcIj5cclxuICAgIHtUT1N9XHJcbiAgPC9kaXY+XHJcbiAgPGRpdiBjbGFzcz1cImZsZXhcIj5cclxuICAgIDxCdXR0b24gb246Y2xpY2s9eygpID0+IHdpbmRvdy5uZXJlaWQuYXBwLnF1aXQoKX0+e3QoJ3BhZ2VzLndlbGNvbWUuVE9TLmJ1dHRvbi1kZWNsaW5lJyl9PC9CdXR0b24+XHJcbiAgICA8QnV0dG9uIG9uOmNsaWNrPXtuZXh0fSB2YXJpYW50PVwiYWNjZW50XCI+e3QoJ3BhZ2VzLndlbGNvbWUuVE9TLmJ1dHRvbi1hY2NlcHQnKX08L0J1dHRvbj5cclxuICA8L2Rpdj5cclxuPC9kaXY+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNFLEtBQUssY0FBQyxDQUFDLEFBQ0wsS0FBSyxDQUFFLHNCQUFzQixDQUM3QixNQUFNLENBQUUsc0JBQXNCLENBQzlCLE9BQU8sQ0FBRSxFQUFFLENBQ1gsY0FBYyxDQUFFLEtBQUssQUFDdkIsQ0FBQyxBQUNELEtBQUssY0FBQyxDQUFDLEFBQ0wsa0JBQWtCLENBQUUsSUFBSSxDQUN4QixXQUFXLENBQUUsSUFBSSxDQUNqQixhQUFhLENBQUUsSUFBSSxDQUNuQixZQUFZLENBQUUsS0FBSyxBQUNyQixDQUFDLEFBQ0QsVUFBVSxjQUFDLENBQUMsQUFDVixPQUFPLENBQUUsR0FBRyxDQUNaLFVBQVUsQ0FBRSxJQUFJLENBQ2hCLFFBQVEsQ0FBRSxJQUFJLENBQ2QsV0FBVyxDQUFFLFFBQVEsQ0FDckIsVUFBVSxDQUFFLFNBQVMsQ0FDckIsV0FBVyxDQUFFLFNBQVMsQUFDeEIsQ0FBQyxBQUNELEtBQUssY0FBQyxDQUFDLEFBQ0wsT0FBTyxDQUFFLElBQUksQ0FDYixlQUFlLENBQUUsYUFBYSxDQUM5QixVQUFVLENBQUUsSUFBSSxBQUNsQixDQUFDIn0= */");
}

// (72:2) <TextBlock variant="titleLarge">
function create_default_slot_2(ctx) {
	let t_1_value = /*t*/ ctx[2]('pages.welcome.TOS.title') + "";
	let t_1;

	const block = {
		c: function create() {
			t_1 = text(t_1_value);
		},
		m: function mount(target, anchor) {
			insert_dev(target, t_1, anchor);
		},
		p: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(t_1);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot_2.name,
		type: "slot",
		source: "(72:2) <TextBlock variant=\\\"titleLarge\\\">",
		ctx
	});

	return block;
}

// (83:4) <Button on:click={() => window.nereid.app.quit()}>
function create_default_slot_1(ctx) {
	let t_1_value = /*t*/ ctx[2]('pages.welcome.TOS.button-decline') + "";
	let t_1;

	const block = {
		c: function create() {
			t_1 = text(t_1_value);
		},
		m: function mount(target, anchor) {
			insert_dev(target, t_1, anchor);
		},
		p: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(t_1);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot_1.name,
		type: "slot",
		source: "(83:4) <Button on:click={() => window.nereid.app.quit()}>",
		ctx
	});

	return block;
}

// (84:4) <Button on:click={next} variant="accent">
function create_default_slot(ctx) {
	let t_1_value = /*t*/ ctx[2]('pages.welcome.TOS.button-accept') + "";
	let t_1;

	const block = {
		c: function create() {
			t_1 = text(t_1_value);
		},
		m: function mount(target, anchor) {
			insert_dev(target, t_1, anchor);
		},
		p: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(t_1);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot.name,
		type: "slot",
		source: "(84:4) <Button on:click={next} variant=\\\"accent\\\">",
		ctx
	});

	return block;
}

function create_fragment(ctx) {
	let div0;
	let textblock;
	let t0;
	let div4;
	let div1;
	let t2;
	let div2;
	let t3;
	let t4;
	let div3;
	let button0;
	let t5;
	let button1;
	let div4_intro;
	let current;

	textblock = new TextBlock({
			props: {
				variant: "titleLarge",
				$$slots: { default: [create_default_slot_2] },
				$$scope: { ctx }
			},
			$$inline: true
		});

	button0 = new Button({
			props: {
				$$slots: { default: [create_default_slot_1] },
				$$scope: { ctx }
			},
			$$inline: true
		});

	button0.$on("click", /*click_handler*/ ctx[3]);

	button1 = new Button({
			props: {
				variant: "accent",
				$$slots: { default: [create_default_slot] },
				$$scope: { ctx }
			},
			$$inline: true
		});

	button1.$on("click", function () {
		if (is_function(/*next*/ ctx[0])) /*next*/ ctx[0].apply(this, arguments);
	});

	const block = {
		c: function create() {
			div0 = element("div");
			create_component(textblock.$$.fragment);
			t0 = space();
			div4 = element("div");
			div1 = element("div");
			div1.textContent = `${/*t*/ ctx[2]('pages.welcome.TOS.note')}`;
			t2 = space();
			div2 = element("div");
			t3 = text(/*TOS*/ ctx[1]);
			t4 = space();
			div3 = element("div");
			create_component(button0.$$.fragment);
			t5 = space();
			create_component(button1.$$.fragment);
			attr_dev(div0, "class", "head svelte-6r2j0c");
			add_location(div0, file, 70, 0, 2966);
			attr_dev(div1, "class", "note");
			add_location(div1, file, 74, 2, 3114);
			attr_dev(div2, "class", "textframe svelte-6r2j0c");
			add_location(div2, file, 78, 2, 3183);
			attr_dev(div3, "class", "flex svelte-6r2j0c");
			add_location(div3, file, 81, 2, 3231);
			attr_dev(div4, "class", "main svelte-6r2j0c");
			add_location(div4, file, 73, 0, 3072);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div0, anchor);
			mount_component(textblock, div0, null);
			insert_dev(target, t0, anchor);
			insert_dev(target, div4, anchor);
			append_dev(div4, div1);
			append_dev(div4, t2);
			append_dev(div4, div2);
			append_dev(div2, t3);
			append_dev(div4, t4);
			append_dev(div4, div3);
			mount_component(button0, div3, null);
			append_dev(div3, t5);
			mount_component(button1, div3, null);
			current = true;
		},
		p: function update(new_ctx, [dirty]) {
			ctx = new_ctx;
			const textblock_changes = {};

			if (dirty & /*$$scope*/ 64) {
				textblock_changes.$$scope = { dirty, ctx };
			}

			textblock.$set(textblock_changes);
			if (!current || dirty & /*TOS*/ 2) set_data_dev(t3, /*TOS*/ ctx[1]);
			const button0_changes = {};

			if (dirty & /*$$scope*/ 64) {
				button0_changes.$$scope = { dirty, ctx };
			}

			button0.$set(button0_changes);
			const button1_changes = {};

			if (dirty & /*$$scope*/ 64) {
				button1_changes.$$scope = { dirty, ctx };
			}

			button1.$set(button1_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(textblock.$$.fragment, local);
			transition_in(button0.$$.fragment, local);
			transition_in(button1.$$.fragment, local);

			if (!div4_intro) {
				add_render_callback(() => {
					div4_intro = create_in_transition(div4, fly, { x: 400 });
					div4_intro.start();
				});
			}

			current = true;
		},
		o: function outro(local) {
			transition_out(textblock.$$.fragment, local);
			transition_out(button0.$$.fragment, local);
			transition_out(button1.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div0);
			destroy_component(textblock);
			if (detaching) detach_dev(t0);
			if (detaching) detach_dev(div4);
			destroy_component(button0);
			destroy_component(button1);
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
	validate_slots('EULA', slots, []);
	let { next } = $$props;
	const { t } = window.nereid.i18n;
	let TOS;

	const EnglishTOS = `
Hello. Nereid is free to use and modify.
This agreement (that you're reading right now) permits you to use Nereid and modify its code freely.
The author of this software is released from any liability or responsibility from any damage done by this software.

[IMPORTANT]
As per the closed alpha version of this software, Nereid will send data to its online services without warning.
Said data includes: your OS version and tag, your hardware identifdiers, crash reports, other error and log information.
These reports should exclude any sensitive data, like the sites you visit or your history, even though in some edge cases, or due to a bug this data may be still sent sometimes.

The software is licensed under an MIT License, which reads as follows:

Copyright (c) 2022 @wheezard

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
  `;

	const LocalizedTOS = t('LocalizedTOS');

	if (LocalizedTOS == 'LocalizedTOS') {
		TOS = EnglishTOS;
	} else if (LocalizedTOS.trim().replaceAll('\n', '').replaceAll(' ', '') == EnglishTOS.trim().replaceAll('\n', '').replaceAll(' ', '')) {
		TOS = LocalizedTOS;
	} else {
		TOS = LocalizedTOS + '\n\nEnglish (original) form:\n' + EnglishTOS;
	}

	const writable_props = ['next'];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<EULA> was created with unknown prop '${key}'`);
	});

	const click_handler = () => window.nereid.app.quit();

	$$self.$$set = $$props => {
		if ('next' in $$props) $$invalidate(0, next = $$props.next);
	};

	$$self.$capture_state = () => ({
		Button,
		TextBlock,
		fly,
		next,
		t,
		TOS,
		EnglishTOS,
		LocalizedTOS
	});

	$$self.$inject_state = $$props => {
		if ('next' in $$props) $$invalidate(0, next = $$props.next);
		if ('TOS' in $$props) $$invalidate(1, TOS = $$props.TOS);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [next, TOS, t, click_handler];
}

class EULA extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment, safe_not_equal, { next: 0 }, add_css);

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "EULA",
			options,
			id: create_fragment.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*next*/ ctx[0] === undefined && !('next' in props)) {
			console.warn("<EULA> was created without expected prop 'next'");
		}
	}

	get next() {
		throw new Error("<EULA>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set next(value) {
		throw new Error("<EULA>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

export default EULA;