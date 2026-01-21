import { useEffect, useRef } from "react";
import { Button, VStack, Box } from "@chakra-ui/react";

declare global {
  interface Window {
    google: any;
  }
}

interface AddressComponents {
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (components: AddressComponents) => void;
  placeholder?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Start typing an address..."
}: AddressAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<any>(null);

  // Load Google Maps API
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('VITE_GOOGLE_MAPS_API_KEY is not set.');
      return;
    }

    if (!document.querySelector('script[data-google-maps]')) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.setAttribute('data-google-maps', 'true');
      document.head.appendChild(script);
    }

    const initAutocomplete = async () => {
      if (!window.google?.maps?.importLibrary || !containerRef.current) {
        setTimeout(initAutocomplete, 100);
        return;
      }

      try {
        const { PlaceAutocompleteElement } = await window.google.maps.importLibrary("places") as any;

        if (autocompleteRef.current) return;

        const autocomplete = new PlaceAutocompleteElement();

        autocompleteRef.current = autocomplete;
        autocomplete.setAttribute('aria-label', 'Address Search');
        autocomplete.setAttribute('placeholder', placeholder);
        autocomplete.types = ['address'];
        autocomplete.componentRestrictions = { country: ['us', 'ca'] };

        // Match existing input styling
        autocomplete.style.width = '100%';
        autocomplete.style.border = '1px solid #d1d5db';
        autocomplete.style.borderRadius = '0.375rem';
        autocomplete.style.padding = '0.5rem 0.75rem';
        autocomplete.style.background = '#ffffff';
        autocomplete.style.color = '#000000';
        autocomplete.style.boxShadow = 'none';

        autocomplete.addEventListener('input', () => {
          const nextValue = autocomplete.value ?? '';
          onChange(nextValue);
        });

        autocomplete.addEventListener('gmp-placeselect', async (event: any) => {
          const place = event?.detail?.place;
          if (!place) return;

          await place.fetchFields({ fields: ['formattedAddress', 'addressComponents'] });

          const components: AddressComponents = {
            street_address: '',
            city: '',
            state: '',
            zip_code: ''
          };

          let streetNumber = '';
          let route = '';

          (place.addressComponents || []).forEach((component: any) => {
            const types = component.types || [];
            const longText = component.longText || component.long_name;
            const shortText = component.shortText || component.short_name;

            if (types.includes('street_number')) streetNumber = longText || '';
            if (types.includes('route')) route = longText || '';
            if (types.includes('locality')) components.city = longText || '';
            if (types.includes('administrative_area_level_1')) components.state = shortText || '';
            if (types.includes('postal_code')) components.zip_code = longText || '';
          });

          components.street_address = `${streetNumber} ${route}`.trim();

          if (place.formattedAddress) onChange(place.formattedAddress);
          onAddressSelect(components);
        });

        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(autocomplete);
      } catch (error) {
        console.error('Failed to initialize PlaceAutocompleteElement:', error);
      }
    };

    initAutocomplete();

    return () => {
      autocompleteRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [onAddressSelect, onChange, placeholder]);

  useEffect(() => {
    if (autocompleteRef.current && autocompleteRef.current.value !== value) {
      autocompleteRef.current.value = value || '';
    }
  }, [value]);

  return (
    <VStack gap={2} width="100%">
      <Box width="100%" ref={containerRef} />

      <Button
        width="100%"
        bg="#f59e0b"
        color="black"
        fontWeight="500"
        _hover={{ bg: "#d97706" }}
        transition="colors 0.15s"
        onClick={() => autocompleteRef.current?.focus?.()}
        size="sm"
      >
        🔍 Search Address
      </Button>
    </VStack>
  );
}
