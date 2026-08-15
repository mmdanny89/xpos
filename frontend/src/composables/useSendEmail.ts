import { ref } from "vue";
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
 * Shared invoice emailing helpers used by the payment dialog.
 *
 * Unlike printing, sending an email always requires the user to confirm or
 * edit the recipient/subject/body first (no silent auto-send), so this
 * composable does not send anything by itself. It resolves the doctype
 * (reusing the same logic as usePrintInvoice) and exposes the reactive state
 * needed to open the CommunicationComposer dialog with the right props.
 * The actual frappe.send_email + frappe.attach_print call happens inside
 * CommunicationComposer once the user confirms the form.
 */
export function useSendEmail() {
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
}
