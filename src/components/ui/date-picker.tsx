"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    date?: Date | string
    setDate: (date: Date | undefined) => void
    placeholder?: string
    disabled?: boolean
    className?: string
    calendarClassName?: string
    popoverAlign?: "start" | "center" | "end"
    fromDate?: Date
    toDate?: Date
    disabledDates?: (date: Date) => boolean
}

export function DatePicker({
    date,
    setDate,
    placeholder = "Pick a date",
    disabled = false,
    className,
    calendarClassName,
    popoverAlign = "start",
    fromDate,
    toDate,
    disabledDates
}: DatePickerProps) {
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
        date ? new Date(date) : undefined
    );

    // Sync internal state if prop changes
    React.useEffect(() => {
        if (date) {
            setSelectedDate(new Date(date));
        } else {
            setSelectedDate(undefined);
        }
    }, [date]);

    const handleSelect = (newDate: Date | undefined) => {
        setSelectedDate(newDate);
        setDate(newDate);
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-[240px] pl-3 text-left font-normal bg-background hover:bg-accent",
                        !date && "text-muted-foreground",
                        className
                    )}
                    disabled={disabled}
                >
                    {selectedDate ? (
                        format(selectedDate, "PPP")
                    ) : (
                        <span>{placeholder}</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align={popoverAlign}>
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleSelect}
                    fromDate={fromDate}
                    toDate={toDate}
                    disabled={disabledDates}
                    initialFocus
                    className={calendarClassName}
                />
            </PopoverContent>
        </Popover>
    )
}
