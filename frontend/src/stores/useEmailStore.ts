import { ref } from "vue";
import { defineStore } from "pinia";
import { showError } from "@/services/api";
import { __ } from "@/lib/translate";

export interface SendEmailOptions {
	/** Override the resolved doctype. */
	doctype?: "Sales Invoice" | "POS Invoice";
	/** Pre-fill the recipient field (e.g. customer's email on file). */
	recipient?: string;
	/** Pre-fill the subject field. Defaults to "Invoice {invoiceName}" inside the composer. */
	subject?: string;
}

export interface EmailComposerProps {
	doctype: "Sales Invoice" | "POS Invoice";
	docname: string;
	defaultRecipient?: string;
	defaultSubject?: string;
}

/**
 * Holds the state for the invoice email composer dialog.
 *
 * This MUST be a Pinia store (not a local composable) because the dialog
 * that triggers it — PaymentDialog — gets unmounted by App.vue's
 * `v-if="cartStore.showPaymentDialog"` as part of the normal "save and
 * clear cart" flow. A composable's local refs die with the component that
 * created them; a Pinia store survives that unmount, which is what lets
 * <CommunicationComposer> (rendered as a sibling in App.vue, not inside
 * PaymentDialog) stay open and show the invoice that was just created.
 *
 * Unlike printing, sending an email always requires the user to confirm or
 * edit the recipient/subject/body first (no silent auto-send), so this store
 * does not send anything by itself — it only prepares the props needed to
 * open CommunicationComposer. The actual frappe.send_email +
 * frappe.attach_print call happens inside that component once the user
 * confirms the form.
 */
export const useEmailStore = defineStore("email", () => {
	const showComposer = ref(false);
	const composerProps = ref<EmailComposerProps | null>(null);

	function resolveDoctype(): "Sales Invoice" | "POS Invoice" {
		return xpos.boot?.pos_settings?.invoice_type === "POS Invoice" ? "POS Invoice" : "Sales Invoice";
	}

	/**
	 * Prepares and opens the email composer for an already-saved invoice.
	 * Must only be called once the invoice has been validated/created on the
	 * server (i.e. after create_invoice resolves with a real name) — calling
	 * this for a draft or not-yet-submitted invoice would let the user try to
	 * email a document the backend can't yet attach_print for.
	 */
	function openEmailComposer(invoiceName: string, options: SendEmailOptions = {}) {
		if (!invoiceName) {
			showError(__("Cannot email an invoice that hasn't been saved yet"));
			return;
		}

		const doctype = options.doctype || resolveDoctype();

		composerProps.value = {
			doctype,
			docname: invoiceName,
			defaultRecipient: options.recipient || "",
			defaultSubject: options.subject,
		};
		showComposer.value = true;
	}

	function closeEmailComposer() {
		showComposer.value = false;
	}

	return {
		showComposer,
		composerProps,
		openEmailComposer,
		closeEmailComposer,
	};
});
