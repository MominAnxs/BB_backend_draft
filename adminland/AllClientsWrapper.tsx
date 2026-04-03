'use client';
import { useState } from 'react';
import { AllClients } from './AllClients';

// This is a wrapper to handle the complexity of modifications
// Will move this functionality to AllClients itself

export function AllClientsWrapper(props: any) {
  return <AllClients {...props} />;
}
