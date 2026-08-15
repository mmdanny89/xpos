<template>
	<Dialog :open="modelValue" @update:open="(val: boolean) => emit('update:modelValue', val)">
		<DialogContent class="max-w-2xl flex flex-col p-0 gap-0">
			<DialogHeader class="shrink-0 px-5 py-3 border-b border-border">
				<DialogTitle>{{ __("Send Email", [], "EmailXPOS") }}</DialogTitle>
				<DialogDescription class="text-xs">{{ docname }}</DialogDescription>
			</DialogHeader>

			<div class="flex-1 p-5 space-y-4 overflow-y-auto">
				<div class="space-y-1.5">
					<label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						{{ __("To", [], "Addresses") }}
					</label>
					<Input
						v-model="emailData.recipients"
						placeholder="destinatario@correo.com"
						:class="{ 'border-destructive': recipientTouched && !isRecipientValid }"
						@blur="recipientTouched = true"
					/>
					<p v-if="recipientTouched && !isRecipientValid" class="text-xs text-destructive">
						{{ __("Please enter at least one valid recipient") }}
					</p>
				</div>

				<div class="space-y-1.5">
					<label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						{{ __("CC") }}
					</label>
					<Input v-model="emailData.cc" placeholder="copia@correo.com (opcional)" />
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1.5">
						<label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
							{{ __("Email Template") }}
						</label>
						<Autocomplete
							v-model="selectedTemplate"
							doctype="Email Template"
							:placeholder="__('No template')"
							:clearable="true"
							:open-on-focus="true"
							@select="onTemplateSelect"
						/>
					</div>

					<div class="space-y-1.5">
						<label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
							{{ __("Print Format") }}
						</label>
						<Autocomplete
							v-model="emailData.printFormat"
							doctype="Print Format"
							:filters="{ doc_type: props.doctype }"
							:open-on-focus="true"
							:clearable="false"
						/>
					</div>
				</div>

				<div class="space-y-1.5">
					<label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						{{ __("Subject") }}
					</label>
					<Input v-model="emailData.subject" placeholder="Escribe el asunto..." />
				</div>

				<div class="space-y-1.5">
					<label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						{{ __("Message") }}
					</label>
					<TextEdit v-model="emailData.content" placeholder="Escribe tu correo aquí..." />
				</div>
			</div>

			<DialogFooter class="shrink-0 border-t border-border px-5 py-3">
				<Button variant="outline" @click="emit('update:modelValue', false)">
					{{ __("Cancel") }}
				</Button>
				<Button variant="default" :disabled="sending || !canSend" @click="sendEmail">
					<Loader2 v-if="sending" class="w-4 h-4 animate-spin" />
					{{ sending ? __("Sending...") : __("Send Email", [], "EmailXPOS") }}
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TextEdit } from "@/components/ui/text-edit";
import { Autocomplete, type AutocompleteOption } from "@/components/ui/autocomplete";
import { Loader2 } from "lucide-vue-next";
import { __ } from "@/lib/translate";
import { call, showError, showSuccess } from "@/services/api";
import { usePosStore } from "@/stores/posStore";

const posStore = usePosStore();

const props = defineProps<{
	modelValue: boolean;
	doctype: string;
	docname: string;
	defaultRecipient?: string;
	defaultSubject?: string;
}>();

const emit = defineEmits<{
	"update:modelValue": [value: boolean];
	sent: [];
}>();

const sending = ref(false);
const recipientTouched = ref(false);

const selectedTemplate = ref<string>("");

const emailData = reactive({
	recipients: props.defaultRecipient || "",
	cc: "",
	subject: props.defaultSubject || `${__("Invoice")} ${props.docname}`,
	content: "",
	printFormat: posStore?.defaultPrintFormat || "XPOS Thermal Receipt",
});

const isRecipientValid = computed(() => {
	const emails = emailData.recipients
		.split(",")
		.map((e) => e.trim())
		.filter(Boolean);
	if (emails.length === 0) return false;
	return emails.every((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
});

const canSend = computed(() => isRecipientValid.value);

async function onTemplateSelect(option: AutocompleteOption) {
	try {
		const template = await call<{ subject?: string; response?: string }>("frappe.client.get", {
			doctype: "Email Template",
			name: option.value,
		});
		if (template?.subject) emailData.subject = template.subject;
		if (template?.response) emailData.content = template.response;
	} catch (error) {
		showError(__("Could not load the selected template"));
	}
}

async function sendEmail() {
	recipientTouched.value = true;
	if (!canSend.value) return;

	sending.value = true;
	try {
		// TODO: confirmar el whitelisted method que combina frappe.send_email
		// + frappe.attach_print en el backend (xpos.api.invoices.??). El
		// adjunto del PDF (vía attach_print) lo resuelve el backend solo,
		// usando emailData.printFormat — el frontend no genera ni sube nada.
		//
		const recipients = emailData.recipients.split(",").map((e) => e.trim());
		const ccList = emailData.cc ? emailData.cc.split(",").map((e) => e.trim()) : [];
		await call("xpos.api.invoices.send_invoice_email", {
			doctype: props.doctype,
			docname: props.docname,
			recipients,
			cc: ccList,
			subject: emailData.subject,
			content: emailData.content,
			print_format: emailData.printFormat,
		});
		showSuccess(__("Email sent successfully"));
		emit("sent");
		emit("update:modelValue", false);
	} catch (error) {
		showError(__("Could not send the email"));
	} finally {
		sending.value = false;
	}
}
</script>
