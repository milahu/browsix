import { createEffect, createSignal, onMount } from 'solid-js';
import { customElement } from 'solid-element';

interface ExitCallback {
	(pid: number, code: number): void;
}

interface OutputCallback {
	(pid: number, output: string): void;
}

interface Kernel {
	fs: any;
	system(cmd: string, onExit: ExitCallback, onStdout: OutputCallback, onStderr: OutputCallback): void;
	kill(pid: number): void;
}

const ERROR = 'FLAGRANT SYSTEM ERROR';

// TODO move to *.css file
const style = `
	#output, #input_container, #input {
		background: #171a1b;
		font-size: 24px;
		font-family: 'Hack', 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif;
		color: #eeeeec;
		-webkit-box-sizing: border-box;
		-moz-box-sizing: border-box;
		box-sizing: border-box;
		width: 100%;
		word-break: break-all;
	}

	#output, #input_container {
		padding-left: 24px;
		padding-right: 24px;
	}

	#output {
		padding-top: 24px;
	}

	#output:empty {
		display: none;
	}

	#input_container {
		padding-bottom: 24px;
	}

	#output:empty + #input_container {
		padding-top: 24px;
	}

	#input {
		display: inline;
		width: 90%;
		background: transparent;
		border: 0;
		outline: 0;
		color: #eeeeec;
		font-size: 24px;
		font-family: 'Hack', 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif;
	}
`;

customElement(
	'browsix-terminal',
	{
		//kernel: undefined,
		ps1: '$ ',
	},
	(props) => {

		let output: HTMLDivElement;
		let input: HTMLInputElement;
		let input_container: HTMLDivElement;
		let kernel: any;
		const ps1 = props.ps1; // copy initial value

		onMount(() => {
			input.addEventListener('keypress', onInput);
			document.body.addEventListener('click', focus);

			(window as any).Boot(
				'XmlHttpRequest',
				['index.json', 'fs', true],
				(err: any, k: Kernel) => {
					console.log("browsix-terminal.ts: boot callback");
					if (err) {
						console.log(err);
						output.innerHTML = ERROR;
						throw new Error(err);
					}
					kernel = k;
				},
				{readOnly: false});
		});

		function onInput(ev: any) {
			// If key pressed is not Return/Enter, skip
			if (ev.keyCode !== 13) return;

			let cmd = input.value;
			output.innerHTML += props.ps1 + cmd + '<br>';
			if (cmd === '') {
				scrollBottom();
				return;
			}
			setEditable(false);
			let bg = cmd[cmd.length - 1] === '&';
			if (bg) {
				cmd = cmd.slice(0, -1).trim();
				setTimeout(() => { setEditable(true); }, 0);
			}

			let completed = (pid: number, code: number) => {
				setEditable(true);
				input.value = '';
				focus();
				scrollBottom();
			};

			let onInput = (pid: number, out: string) => {
				// Replace all LF with HTML breaks
				out = out.split('\n').join('<br>');
				output.innerHTML += out;
				scrollBottom();
			};

			kernel.system(cmd, completed, onInput, onInput);
		}

		function focus() {
			input.focus();
		}

		function setEditable(editable: boolean) {
			// Hide input if not editable
			input_container.style.visibility = (editable) ? '' : 'hidden';
		}

		function scrollBottom() {
			window.scrollTo(0, document.documentElement.scrollHeight
				|| document.body.scrollHeight);
		}

		return (
			<div>
				<style>{style}</style>
        <div id="output" ref={output}></div>
        <div id="input_container" ref={input_container}>
          {ps1}
          <input id="input" ref={input} autofocus={true}/>
        </div>
			</div>
		);
	}
)
