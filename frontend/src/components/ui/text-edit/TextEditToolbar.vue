<script setup lang="ts">
import { cn } from "@/lib/utils";
import type { Editor } from "@tiptap/vue-3";
import {
	Bold,
	Italic,
	Underline,
	List,
	ListOrdered,
	Link2,
	Link2Off,
	Heading1,
	Heading2,
	Heading3,
} from "lucide-vue-next";
import { ref, watch, onBeforeUnmount } from "vue";

const props = defineProps<{
	editor: Editor | null;
}>();

const showLinkInput = ref(false);
const linkUrl = ref("");

// Tiptap no es reactivo por sí mismo: este contador se incrementa en cada
// transacción del editor (cada tecleo, cada cambio de selección) para forzar
// que Vue vuelva a evaluar isActive() y re-pintar qué botones se ven activos.
const updateTrigger = ref(0);

function handleEditorUpdate() {
	updateTrigger.value++;
}

watch(
	() => props.editor,
	(newEditor, oldEditor) => {
		oldEditor?.off("transaction", handleEditorUpdate);
		newEditor?.on("transaction", handleEditorUpdate);
	},
	{ immediate: true },
);

onBeforeUnmount(() => {
	props.editor?.off("transaction", handleEditorUpdate);
});

function isActive(name: string, attrs?: Record<string, unknown>): boolean {
	// Lee updateTrigger para que Vue registre esta función como dependiente de él.
	void updateTrigger.value;
	return props.editor?.isActive(name, attrs) ?? false;
}

function toggleBold() {
	props.editor?.chain().focus().toggleBold().run();
}

function toggleItalic() {
	props.editor?.chain().focus().toggleItalic().run();
}

function toggleUnderline() {
	props.editor?.chain().focus().toggleUnderline().run();
}

function toggleHeading(level: 1 | 2 | 3) {
	props.editor?.chain().focus().toggleHeading({ level }).run();
}

function toggleBulletList() {
	props.editor?.chain().focus().toggleBulletList().run();
}

function toggleOrderedList() {
	props.editor?.chain().focus().toggleOrderedList().run();
}

function openLinkInput() {
	if (isActive("link")) {
		props.editor?.chain().focus().unsetLink().run();
		return;
	}
	linkUrl.value = "";
	showLinkInput.value = true;
}

function applyLink() {
	const url = linkUrl.value.trim();
	if (url) {
		props.editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
	}
	showLinkInput.value = false;
	linkUrl.value = "";
}

function cancelLink() {
	showLinkInput.value = false;
	linkUrl.value = "";
}

interface ToolbarButton {
	icon: typeof Bold;
	action: () => void;
	active: boolean;
	label: string;
}

const buttons = (): ToolbarButton[] => [
	{ icon: Bold, action: toggleBold, active: isActive("bold"), label: "Negrita" },
	{ icon: Italic, action: toggleItalic, active: isActive("italic"), label: "Itálica" },
	{ icon: Underline, action: toggleUnderline, active: isActive("underline"), label: "Subrayado" },
];
</script>

<template>
	<div class="flex items-center gap-0.5 flex-wrap border-b border-border bg-muted/30 px-1.5 py-1">
		<button
			v-for="(btn, idx) in buttons()"
			:key="idx"
			type="button"
			:title="btn.label"
			:class="
				cn(
					'p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
					btn.active && 'bg-accent text-accent-foreground',
				)
			"
			@mousedown.prevent="btn.action"
		>
			<component :is="btn.icon" class="w-3.5 h-3.5" />
		</button>

		<div class="w-px h-4 bg-border mx-1" />

		<button
			type="button"
			title="Título 1"
			:class="
				cn(
					'p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
					isActive('heading', { level: 1 }) && 'bg-accent text-accent-foreground',
				)
			"
			@mousedown.prevent="toggleHeading(1)"
		>
			<Heading1 class="w-3.5 h-3.5" />
		</button>
		<button
			type="button"
			title="Título 2"
			:class="
				cn(
					'p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
					isActive('heading', { level: 2 }) && 'bg-accent text-accent-foreground',
				)
			"
			@mousedown.prevent="toggleHeading(2)"
		>
			<Heading2 class="w-3.5 h-3.5" />
		</button>
		<button
			type="button"
			title="Título 3"
			:class="
				cn(
					'p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
					isActive('heading', { level: 3 }) && 'bg-accent text-accent-foreground',
				)
			"
			@mousedown.prevent="toggleHeading(3)"
		>
			<Heading3 class="w-3.5 h-3.5" />
		</button>

		<div class="w-px h-4 bg-border mx-1" />

		<button
			type="button"
			title="Lista con viñetas"
			:class="
				cn(
					'p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
					isActive('bulletList') && 'bg-accent text-accent-foreground',
				)
			"
			@mousedown.prevent="toggleBulletList"
		>
			<List class="w-3.5 h-3.5" />
		</button>
		<button
			type="button"
			title="Lista numerada"
			:class="
				cn(
					'p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
					isActive('orderedList') && 'bg-accent text-accent-foreground',
				)
			"
			@mousedown.prevent="toggleOrderedList"
		>
			<ListOrdered class="w-3.5 h-3.5" />
		</button>

		<div class="w-px h-4 bg-border mx-1" />

		<div class="relative">
			<button
				type="button"
				:title="isActive('link') ? 'Quitar enlace' : 'Insertar enlace'"
				:class="
					cn(
						'p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
						isActive('link') && 'bg-accent text-accent-foreground',
					)
				"
				@mousedown.prevent="openLinkInput"
			>
				<Link2Off v-if="isActive('link')" class="w-3.5 h-3.5" />
				<Link2 v-else class="w-3.5 h-3.5" />
			</button>

			<div
				v-if="showLinkInput"
				class="absolute top-full mt-1 start-0 z-10 flex items-center gap-1 bg-popover border border-border rounded-lg shadow-md p-1.5"
			>
				<input
					v-model="linkUrl"
					type="text"
					placeholder="https://..."
					autofocus
					class="h-7 w-44 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					@keydown.enter.prevent="applyLink"
					@keydown.escape.prevent="cancelLink"
				/>
				<button
					type="button"
					class="h-7 px-2 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
					@mousedown.prevent="applyLink"
				>
					Aplicar
				</button>
			</div>
		</div>
	</div>
</template>
