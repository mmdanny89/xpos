<script setup lang="ts">
import { cn } from "@/lib/utils";
import { Editor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExtension from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import PlaceholderExtension from "@tiptap/extension-placeholder";
import { onBeforeUnmount, onMounted, ref, watch, type HTMLAttributes } from "vue";
import TextEditToolbar from "./TextEditToolbar.vue";

const props = defineProps<{
	placeholder?: string;
	disabled?: boolean;
	class?: HTMLAttributes["class"];
}>();

const modelValue = defineModel<string>({ default: "" });

const editor = ref<Editor | null>(null);

onMounted(() => {
	editor.value = new Editor({
		content: modelValue.value || "",
		editable: !props.disabled,
		extensions: [
			StarterKit,
			UnderlineExtension,
			LinkExtension.configure({
				openOnClick: false,
				autolink: true,
			}),
			PlaceholderExtension.configure({
				placeholder: props.placeholder || "",
			}),
		],
		editorProps: {
			attributes: {
				class: "xpos-text-edit-content focus:outline-none px-3 py-2 text-sm min-h-[120px] max-h-[280px] overflow-y-auto",
			},
		},
		onUpdate: ({ editor: editorInstance }) => {
			const html = editorInstance.getHTML();
			// Evita reescribir si no cambió, previene loops con el watch de abajo.
			if (html !== modelValue.value) {
				modelValue.value = html;
			}
		},
	});
});

onBeforeUnmount(() => {
	editor.value?.destroy();
});

// Sincroniza cambios externos al modelValue (ej: al elegir un Email Template)
// con el contenido interno del editor, sin pisar mientras el usuario escribe.
watch(modelValue, (newValue) => {
	if (!editor.value) return;
	const current = editor.value.getHTML();
	if (newValue !== current) {
		editor.value.commands.setContent(newValue || "", false);
	}
});

watch(
	() => props.disabled,
	(isDisabled) => {
		editor.value?.setEditable(!isDisabled);
	},
);

function clear() {
	editor.value?.commands.clearContent(true);
}

function focusEditor() {
	editor.value?.commands.focus("end");
}

defineExpose({ clear, focus: focusEditor });
</script>

<template>
	<div
		:class="
			cn(
				'relative flex flex-col w-full rounded-lg border border-input bg-transparent shadow-sm transition-colors focus-within:ring-2 focus-within:ring-ring overflow-hidden',
				disabled && 'cursor-not-allowed opacity-50',
				props.class,
			)
		"
	>
		<TextEditToolbar :editor="editor" />
		<EditorContent :editor="editor" />
	</div>
</template>

<style>
.xpos-text-edit-content p {
	margin: 0 0 0.5em 0;
}
.xpos-text-edit-content p:last-child {
	margin-bottom: 0;
}
.xpos-text-edit-content h1 {
	font-size: 1.5em;
	font-weight: 700;
	margin: 0.5em 0;
}
.xpos-text-edit-content h2 {
	font-size: 1.25em;
	font-weight: 700;
	margin: 0.5em 0;
}
.xpos-text-edit-content h3 {
	font-size: 1.1em;
	font-weight: 600;
	margin: 0.5em 0;
}
.xpos-text-edit-content ul,
.xpos-text-edit-content ol {
	padding-inline-start: 1.5em;
	margin: 0.5em 0;
}
.xpos-text-edit-content a {
	color: hsl(var(--primary));
	text-decoration: underline;
}
.xpos-text-edit-content p.is-editor-empty:first-child::before {
	content: attr(data-placeholder);
	float: left;
	height: 0;
	pointer-events: none;
	color: hsl(var(--muted-foreground));
}
</style>
