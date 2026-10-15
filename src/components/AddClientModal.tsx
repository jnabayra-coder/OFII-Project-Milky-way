import React from 'react';
import { ClientFormModal } from './ClientFormModal';
import { ClientSummary } from '../types';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveClient: (newClient: ClientSummary) => void;
  initialClientName?: string;
  clientToEdit?: ClientSummary | null;
}

export const AddClientModal: React.FC<AddClientModalProps> = ({
  isOpen,
  onClose,
  onSaveClient,
  initialClientName = '',
  clientToEdit = null,
}) => {
  return (
    <ClientFormModal
      isOpen={isOpen}
      onClose={onClose}
      onSaveClient={onSaveClient}
      initialClientName={initialClientName}
      clientToEdit={clientToEdit}
    />
  );
};
