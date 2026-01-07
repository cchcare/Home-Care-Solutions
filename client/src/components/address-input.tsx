import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface AddressInputProps {
  streetAddress: string;
  streetAddress2: string;
  city: string;
  state: string;
  zipCode: string;
  onChange: (field: string, value: string) => void;
  disabled?: boolean;
}

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
];

export function AddressInput({
  streetAddress,
  streetAddress2,
  city,
  state,
  zipCode,
  onChange,
  disabled = false,
}: AddressInputProps) {
  const [isLookingUp, setIsLookingUp] = useState(false);

  const lookupZipCode = useCallback(async (zip: string) => {
    if (zip.length !== 5 || !/^\d{5}$/.test(zip)) return;
    
    setIsLookingUp(true);
    try {
      const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (response.ok) {
        const data = await response.json();
        if (data.places && data.places.length > 0) {
          const place = data.places[0];
          onChange("city", place["place name"]);
          onChange("state", place["state abbreviation"]);
        }
      }
    } catch (error) {
      console.log("ZIP lookup failed, user can enter manually");
    } finally {
      setIsLookingUp(false);
    }
  }, [onChange]);

  useEffect(() => {
    if (zipCode && zipCode.length === 5 && !city && !state) {
      lookupZipCode(zipCode);
    }
  }, [zipCode, city, state, lookupZipCode]);

  const handleZipChange = (value: string) => {
    const cleanedZip = value.replace(/\D/g, "").slice(0, 5);
    onChange("zipCode", cleanedZip);
    
    if (cleanedZip.length === 5) {
      lookupZipCode(cleanedZip);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-muted-foreground text-sm">Street Address</Label>
        <Input
          data-testid="input-street-address"
          value={streetAddress}
          onChange={(e) => onChange("address", e.target.value)}
          placeholder="123 Main Street"
          autoComplete="street-address"
          disabled={disabled}
        />
      </div>
      
      <div>
        <Label className="text-muted-foreground text-sm">Street Address 2</Label>
        <Input
          data-testid="input-street-address-2"
          value={streetAddress2}
          onChange={(e) => onChange("address2", e.target.value)}
          placeholder="Apt, Suite, Unit, etc."
          autoComplete="address-line2"
          disabled={disabled}
        />
      </div>
      
      <div className="grid grid-cols-6 gap-2">
        <div className="col-span-2">
          <Label className="text-muted-foreground text-sm flex items-center gap-1">
            Zip Code
            {isLookingUp && <Loader2 className="w-3 h-3 animate-spin" />}
          </Label>
          <Input
            data-testid="input-zip-code"
            value={zipCode}
            onChange={(e) => handleZipChange(e.target.value)}
            placeholder="12345"
            autoComplete="postal-code"
            maxLength={5}
            disabled={disabled}
          />
        </div>
        
        <div className="col-span-2">
          <Label className="text-muted-foreground text-sm">City</Label>
          <Input
            data-testid="input-city"
            value={city}
            onChange={(e) => onChange("city", e.target.value)}
            placeholder="City"
            autoComplete="address-level2"
            disabled={disabled}
          />
        </div>
        
        <div className="col-span-2">
          <Label className="text-muted-foreground text-sm">State</Label>
          <Select
            value={state}
            onValueChange={(value) => onChange("state", value)}
            disabled={disabled}
          >
            <SelectTrigger data-testid="select-state">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.value} - {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
