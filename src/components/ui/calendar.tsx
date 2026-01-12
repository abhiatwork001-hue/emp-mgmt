"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-4", className)}
            classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4 relative w-[300px] sm:w-[350px]",
                month_caption: "flex justify-center pt-1 items-center mb-4 min-h-[40px]",
                caption_label: "text-sm font-semibold",
                caption_dropdowns: "flex justify-center gap-1",
                dropdown: "bg-transparent cursor-pointer p-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring rounded-md border border-input/50 hover:bg-accent/50 transition-colors h-8 leading-none",
                dropdown_year: "min-w-[4.5rem]",
                dropdown_month: "min-w-[8rem]",
                nav: "space-x-1 flex items-center",
                button_previous: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1 top-3 z-20"
                ),
                button_next: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1 top-3 z-20"
                ),
                month_grid: "w-full border-collapse",
                weekdays: "grid grid-cols-7 w-full mb-1",
                weekday: "text-muted-foreground rounded-md font-medium text-[0.7rem] text-center uppercase tracking-normal opacity-50",
                week: "grid grid-cols-7 w-full mt-1.5",
                day: "h-11 w-full text-center text-sm p-0 relative flex items-center justify-center",
                day_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-full transition-all flex items-center justify-center text-sm"
                ),
                range_end: "day-range-end",
                selected:
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-bold",
                today: "bg-accent text-accent-foreground ring-1 ring-primary/30",
                outside:
                    "text-muted-foreground/30 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
                disabled: "text-muted-foreground/20 cursor-not-allowed",
                range_middle:
                    "aria-selected:bg-accent aria-selected:text-accent-foreground",
                hidden: "invisible",
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation, ...props }) => {
                    if (orientation === "left") return <ChevronLeft className="h-4 w-4" />;

                    if (orientation === "right") return <ChevronRight className="h-4 w-4" />;
                    return <ChevronLeft className="h-4 w-4" />; // Default fallback
                }
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
